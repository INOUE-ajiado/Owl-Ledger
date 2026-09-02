package backend

import (
	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
)

func init() {
	// Register HTTP (HTTPS) function for OCR API
	functions.HTTP("api", OCRAPIHandler)

	// Register CloudEvent (Firestore Trigger) functions
	functions.CloudEvent("onOrderConfirmationApproved", OnOrderConfirmationApproved)
	functions.CloudEvent("onLedgerApproved", OnLedgerApproved)
	functions.CloudEvent("onLedgerSubmittedToAccounting", OnLedgerSubmittedToAccounting)
}
