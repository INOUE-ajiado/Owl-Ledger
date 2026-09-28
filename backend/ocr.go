package backend

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

var geminiHTTPClient = &http.Client{Timeout: 60 * time.Second}

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

// 呼び出しを許可するオリジン (本番は Firebase Hosting 経由の同一オリジンなので CORS は不要だが、開発用に限定して許可)
var allowedOrigins = map[string]bool{
	"https://test-54084-466403.web.app":         true,
	"https://test-54084-466403.firebaseapp.com": true,
	"http://localhost:5173":                     true,
}

// CORS ヘッダーを設定するユーティリティ (許可リストにあるオリジンのみ)
func setupCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
	}

	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}

// 受け付けるファイル形式 (レシート画像/PDF)
func isAllowedReceiptType(mimeType string) bool {
	return strings.HasPrefix(mimeType, "image/") || mimeType == "application/pdf"
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

	// ログイン済みの社員以外は利用不可 (Gemini API の不正利用を防ぐ)
	if err := requireStaff(r.Context(), r); err != nil {
		if !errors.Is(err, errUnauthorized) {
			fmt.Fprintf(os.Stderr, "auth check failed: %v\n", err)
		}
		http.Error(w, "認証が必要です。", http.StatusUnauthorized)
		return
	}

	// Max 10MB file (リクエスト全体もそれ以上は読まない)
	r.Body = http.MaxBytesReader(w, r.Body, 11<<20)
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
	if !isAllowedReceiptType(mimeType) {
		http.Error(w, "画像またはPDFのみ対応しています。", http.StatusBadRequest)
		return
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

	// モデルは環境変数で変更可能 (既定は従来どおり gemini-1.5-flash)
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-1.5-flash"
	}
	// API キーは URL に含めずヘッダーで送る (エラーメッセージやログに漏れないように)
	apiUrl := fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/%s:generateContent", model)

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

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, apiUrl, bytes.NewBuffer(jsonPayload))
	if err != nil {
		http.Error(w, "Failed to build request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", apiKey)

	resp, err := geminiHTTPClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Gemini API connection error: %v\n", err)
		http.Error(w, "AI APIへの接続に失敗しました。", http.StatusBadGateway)
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
