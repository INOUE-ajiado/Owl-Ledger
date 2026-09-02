package backend

import (
	"context"
	"fmt"
	"os"
	"strings"

	"cloud.google.com/go/firestore"
	cloudevents "github.com/cloudevents/sdk-go/v2"
	"github.com/googleapis/google-cloudevents-go/cloud/firestoredata"
	"google.golang.org/api/iterator"
)

var firestoreClient *firestore.Client

func initFirestoreClient(ctx context.Context) error {
	if firestoreClient != nil {
		return nil
	}
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = os.Getenv("FIREBASE_PROJECT_ID")
	}
	if projectID == "" {
		projectID = firestore.DetectProjectID
	}
	
	var err error
	firestoreClient, err = firestore.NewClient(ctx, projectID)
	if err != nil {
		return fmt.Errorf("failed to create firestore client: %v", err)
	}
	return nil
}

// firestoredata.Value から文字列型を取り出すヘルパー
func getStringValue(v *firestoredata.Value) string {
	if v == nil {
		return ""
	}
	if sv, ok := v.GetValueType().(*firestoredata.Value_StringValue); ok {
		return sv.StringValue
	}
	return ""
}

// CloudEventからDocumentEventDataをパースするヘルパー
func parseDocumentEvent(event cloudevents.Event) (*firestoredata.DocumentEventData, error) {
	var data firestoredata.DocumentEventData
	if err := event.DataAs(&data); err != nil {
		return nil, fmt.Errorf("failed to parse CloudEvent data: %v", err)
	}
	return &data, nil
}

// 1. OnOrderConfirmationApproved
// Trigger: projects/{projectId}
func OnOrderConfirmationApproved(ctx context.Context, event cloudevents.Event) error {
	data, err := parseDocumentEvent(event)
	if err != nil {
		return err
	}

	before := data.GetOldValue()
	after := data.GetValue()
	if before == nil || after == nil {
		return fmt.Errorf("missing before or after document state")
	}

	beforeStatus := getStringValue(before.Fields["orderConfirmationStatus"])
	afterStatus := getStringValue(after.Fields["orderConfirmationStatus"])

	// '承認済み' へのステータス変更を検知
	if beforeStatus != "承認済み" && afterStatus == "承認済み" {
		submitterUid := getStringValue(after.Fields["orderConfirmationSubmitterUid"])
		if submitterUid != "" {
			title := getStringValue(after.Fields["title"])
			
			parts := strings.Split(after.GetName(), "/")
			projectId := parts[len(parts)-1]

			if err := initFirestoreClient(ctx); err != nil {
				return err
			}

			// 通知の追加
			_, _, err = firestoreClient.Collection("notifications").Add(ctx, map[string]interface{}{
				"userId":    submitterUid,
				"message":   fmt.Sprintf("プロジェクト「%s」の受注伝票が承認されました。", title),
				"link":      fmt.Sprintf("/order-confirmation-approval/%s", projectId),
				"isRead":    false,
				"createdAt": firestore.ServerTimestamp,
			})
			if err != nil {
				return fmt.Errorf("failed to add notification: %v", err)
			}
			fmt.Printf("Added notification for user %s, project %s\n", submitterUid, projectId)
		}
	}

	return nil
}

// 2. OnLedgerApproved
// Trigger: ledgerReports/{reportId}
func OnLedgerApproved(ctx context.Context, event cloudevents.Event) error {
	data, err := parseDocumentEvent(event)
	if err != nil {
		return err
	}

	before := data.GetOldValue()
	after := data.GetValue()
	if before == nil || after == nil {
		return fmt.Errorf("missing before or after document state")
	}

	beforeStatus := getStringValue(before.Fields["status"])
	afterStatus := getStringValue(after.Fields["status"])

	// '承認済み' へのステータス変更を検知
	if beforeStatus != "承認済み" && afterStatus == "承認済み" {
		submitterUid := getStringValue(after.Fields["submitterUid"])
		if submitterUid != "" {
			month := getStringValue(after.Fields["month"])
			
			var reportNumber interface{}
			if rnVal, ok := after.Fields["reportNumber"]; ok {
				if iv, ok := rnVal.GetValueType().(*firestoredata.Value_IntegerValue); ok {
					reportNumber = iv.IntegerValue
				} else if sv, ok := rnVal.GetValueType().(*firestoredata.Value_StringValue); ok {
					reportNumber = sv.StringValue
				}
			}
			if reportNumber == nil {
				reportNumber = ""
			}

			parts := strings.Split(after.GetName(), "/")
			reportId := parts[len(parts)-1]

			if err := initFirestoreClient(ctx); err != nil {
				return err
			}

			// 通知の追加
			_, _, err = firestoreClient.Collection("notifications").Add(ctx, map[string]interface{}{
				"userId":    submitterUid,
				"message":   fmt.Sprintf("出納帳（%s No.%v）が承認されました。", month, reportNumber),
				"link":      fmt.Sprintf("/approval/%s", reportId),
				"isRead":    false,
				"createdAt": firestore.ServerTimestamp,
			})
			if err != nil {
				return fmt.Errorf("failed to add notification: %v", err)
			}
			fmt.Printf("Added notification for user %s, ledger report %s\n", submitterUid, reportId)
		}
	}

	return nil
}

// 3. OnLedgerSubmittedToAccounting
// Trigger: ledgerReports/{reportId}
func OnLedgerSubmittedToAccounting(ctx context.Context, event cloudevents.Event) error {
	data, err := parseDocumentEvent(event)
	if err != nil {
		return err
	}

	before := data.GetOldValue()
	after := data.GetValue()
	if before == nil || after == nil {
		return fmt.Errorf("missing before or after document state")
	}

	beforeStatus := getStringValue(before.Fields["status"])
	afterStatus := getStringValue(after.Fields["status"])

	// '経理提出済み' へのステータス変更を検知
	if beforeStatus != "経理提出済み" && afterStatus == "経理提出済み" {
		parts := strings.Split(after.GetName(), "/")
		reportId := parts[len(parts)-1]
		linkToDelete := fmt.Sprintf("/approval/%s", reportId)

		if err := initFirestoreClient(ctx); err != nil {
			return err
		}

		// 削除対象の通知を取得
		iter := firestoreClient.Collection("notifications").Where("link", "==", linkToDelete).Documents(ctx)
		defer iter.Stop()

		batch := firestoreClient.Batch()
		hasDocs := false

		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				return fmt.Errorf("failed to iterate notifications: %v", err)
			}
			batch.Delete(doc.Ref)
			hasDocs = true
		}

		if hasDocs {
			_, err = batch.Commit(ctx)
			if err != nil {
				return fmt.Errorf("failed to commit batch delete: %v", err)
			}
			fmt.Printf("Deleted notifications linked to %s\n", linkToDelete)
		}
	}

	return nil
}
