package backend

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strings"
	"sync"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var (
	authClient     *auth.Client
	authClientOnce sync.Once
	authClientErr  error
)

func getAuthClient(ctx context.Context) (*auth.Client, error) {
	authClientOnce.Do(func() {
		// プロジェクトIDは環境変数から (未設定なら SDK が実行環境から検出する)
		projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
		if projectID == "" {
			projectID = os.Getenv("FIREBASE_PROJECT_ID")
		}
		app, err := firebase.NewApp(context.Background(), &firebase.Config{ProjectID: projectID})
		if err != nil {
			authClientErr = err
			return
		}
		authClient, authClientErr = app.Auth(context.Background())
	})
	return authClient, authClientErr
}

var errUnauthorized = errors.New("unauthorized")

// requireStaff は Authorization ヘッダーの Firebase ID トークンを検証し、
// permissions に登録済みの社員 (匿名でない・メール確認済み) であることを確認する。
func requireStaff(ctx context.Context, r *http.Request) error {
	header := r.Header.Get("Authorization")
	idToken, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || idToken == "" {
		return errUnauthorized
	}

	client, err := getAuthClient(ctx)
	if err != nil {
		return err
	}
	token, err := client.VerifyIDToken(ctx, idToken)
	if err != nil {
		return errUnauthorized
	}
	if token.Firebase.SignInProvider == "anonymous" {
		return errUnauthorized
	}
	email, _ := token.Claims["email"].(string)
	verified, _ := token.Claims["email_verified"].(bool)
	if email == "" || !verified {
		return errUnauthorized
	}

	if err := initFirestoreClient(ctx); err != nil {
		return err
	}
	if _, err := firestoreClient.Collection("permissions").Doc(email).Get(ctx); err != nil {
		if status.Code(err) == codes.NotFound {
			return errUnauthorized
		}
		return err
	}
	return nil
}
