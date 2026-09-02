package backend

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
)

// Gemini API Request Payload Structures
type Part struct {
	Text       string      `json:"text,omitempty"`
	InlineData *InlineData `json:"inlineData,omitempty"`
}

type InlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"` // Base64 encoded image
}

type Content struct {
	Parts []Part `json:"parts"`
}

type GeminiRequest struct {
	Contents []Content `json:"contents"`
}

// Gemini API Response Structures
type GeminiResponse struct {
	Candidates []Candidate `json:"candidates"`
}

type Candidate struct {
	Content *ResponseContent `json:"content"`
}

type ResponseContent struct {
	Parts []ResponsePart `json:"parts"`
}

type ResponsePart struct {
	Text string `json:"text"`
}

// CORS ヘッダーを設定するユーティリティ
func setupCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin != "" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
	} else {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	}

	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}

// OCRAPIHandler handles the receipt OCR request
func OCRAPIHandler(w http.ResponseWriter, r *http.Request) {
	if setupCORS(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	// Max 10MB file
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("receipt")
	if err != nil {
		http.Error(w, "レシート画像が見つかりません。", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file content
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, file); err != nil {
		http.Error(w, "ファイルの読み込みに失敗しました。", http.StatusInternalServerError)
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg" // Fallback
	}

	base64Image := base64.StdEncoding.EncodeToString(buf.Bytes())

	prompt := `このレシート画像から以下の情報をJSON形式で抽出してください:
  - "date": 日付 (YYYY-MM-DD形式)
  - "storeName": 店名
  - "totalAmount": 合計金額 (数値のみ)
  - "items": 品目リスト (各品目は "name" と "price" を持つオブジェクト)
  もし情報が読み取れない場合は、該当する項目を空文字("")または空の配列([])にしてください。JSON以外のテキストは含めないでください。`

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		// Firebase GCF v1/v2 config config.gemini.key fallback or other configuration mechanism
		// GCFでは環境変数 GEMINI_API_KEY を設定するのが推奨されます
		fmt.Fprintln(os.Stderr, "GEMINI_API_KEY is not set in environment variables")
		http.Error(w, "サーバーの設定エラーです。", http.StatusInternalServerError)
		return
	}

	// Use stable v1 gemini-1.5-flash
	apiUrl := fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=%s", apiKey)

	payload := GeminiRequest{
		Contents: []Content{
			{
				Parts: []Part{
					{Text: prompt},
					{InlineData: &InlineData{MimeType: mimeType, Data: base64Image}},
				},
			},
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, "Failed to marshal payload", http.StatusInternalServerError)
		return
	}

	resp, err := http.Post(apiUrl, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		http.Error(w, fmt.Sprintf("AI APIへの接続エラー: %v", err), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		fmt.Fprintf(os.Stderr, "Gemini API Error Status: %d, Body: %s\n", resp.StatusCode, string(bodyBytes))
		http.Error(w, "AIからの解析レスポンス取得に失敗しました。", http.StatusInternalServerError)
		return
	}

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		http.Error(w, "AIからのレスポンスのパースに失敗しました。", http.StatusInternalServerError)
		return
	}

	if len(geminiResp.Candidates) == 0 || geminiResp.Candidates[0].Content == nil || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		http.Error(w, "AIからの応答形式が正しくありません。", http.StatusInternalServerError)
		return
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text

	// Extract JSON using regex
	re := regexp.MustCompile("(?s)```json\\s*([\\s\\S]*?)\\s*```|({[\\s\\S]*})")
	match := re.FindStringSubmatch(text)

	var jsonString string
	if len(match) > 1 && match[1] != "" {
		jsonString = match[1]
	} else if len(match) > 2 && match[2] != "" {
		jsonString = match[2]
	}

	if jsonString == "" {
		http.Error(w, "AIの応答からJSONを抽出できませんでした。", http.StatusInternalServerError)
		return
	}

	// Validate JSON
	var parsedData map[string]interface{}
	if err := json.Unmarshal([]byte(jsonString), &parsedData); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse extracted JSON: %s\n", jsonString)
		http.Error(w, "AIの応答から抽出したJSONのパースに失敗しました。", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(jsonString))
}
