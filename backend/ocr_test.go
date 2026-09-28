package backend

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOCRRejectsRequestsWithoutToken(t *testing.T) {
	for _, header := range []string{"", "Bearer ", "Basic abc"} {
		req := httptest.NewRequest(http.MethodPost, "/api/ocr", strings.NewReader("x"))
		if header != "" {
			req.Header.Set("Authorization", header)
		}
		rec := httptest.NewRecorder()
		OCRAPIHandler(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("Authorization %q: status = %d, want 401", header, rec.Code)
		}
	}
}

func TestOCRCORSOnlyAllowsKnownOrigins(t *testing.T) {
	cases := map[string]bool{
		"https://test-54084-466403.web.app": true,
		"http://localhost:5173":             true,
		"https://evil.example":              false,
	}
	for origin, allowed := range cases {
		req := httptest.NewRequest(http.MethodOptions, "/api/ocr", nil)
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		OCRAPIHandler(rec, req)
		got := rec.Header().Get("Access-Control-Allow-Origin")
		if allowed && got != origin {
			t.Errorf("%s: Allow-Origin = %q, want %q", origin, got, origin)
		}
		if !allowed && got != "" {
			t.Errorf("%s: Allow-Origin = %q, want none", origin, got)
		}
		if rec.Header().Get("Access-Control-Allow-Credentials") != "" {
			t.Errorf("%s: credentials must not be allowed", origin)
		}
	}
}

func TestOCRRejectsNonPost(t *testing.T) {
	rec := httptest.NewRecorder()
	OCRAPIHandler(rec, httptest.NewRequest(http.MethodGet, "/api/ocr", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", rec.Code)
	}
}

func TestIsAllowedReceiptType(t *testing.T) {
	for mime, want := range map[string]bool{
		"image/jpeg": true, "image/heic": true, "application/pdf": true,
		"text/html": false, "application/octet-stream": false,
	} {
		if got := isAllowedReceiptType(mime); got != want {
			t.Errorf("%s: got %v, want %v", mime, got, want)
		}
	}
}
