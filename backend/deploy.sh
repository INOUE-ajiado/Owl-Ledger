#!/bin/bash

# デフォルト設定
PROJECT_ID="test-54084-466403"
REGION="asia-northeast1"

echo "=== Owl Ledger Backend (Go) デプロイスクリプト ==="

# デプロイ前にビルドテスト
echo "ローカルでビルドテストを実行中..."
go build -o /dev/null ./cmd/server
if [ $? -ne 0 ]; then
  echo "❌ ビルドエラーが発生したため、デプロイを中止します。"
  exit 1
fi
echo "✅ ビルドテスト成功。"

# プロジェクトIDの設定
read -p "GCP プロジェクトID [$PROJECT_ID]: " input_project
PROJECT_ID=${input_project:-$PROJECT_ID}
gcloud config set project $PROJECT_ID

# Gemini APIキー of input
if [ -z "$GEMINI_API_KEY" ]; then
  read -s -p "Gemini API キーを入力してください: " input_key
  echo ""
  GEMINI_API_KEY=$input_key
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️ Gemini API キーが空です。APIのデプロイはスキップされるか、失敗する可能性があります。"
fi

echo "プロジェクト: $PROJECT_ID, リージョン: $REGION にデプロイを開始します..."

# 1. api (HTTPSトリガー) のデプロイ
if [ ! -z "$GEMINI_API_KEY" ]; then
  echo "🚀 api (HTTPSトリガー) をデプロイ中..."
  gcloud functions deploy api \
    --gen2 \
    --runtime=go123 \
    --region=$REGION \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point=api \
    --set-env-vars=GEMINI_API_KEY="$GEMINI_API_KEY"
else
  echo "⚠️ Gemini API キーがないため、api (HTTPSトリガー) のデプロイをスキップします。"
fi

# 2. onOrderConfirmationApproved のデプロイ
echo "🚀 onOrderConfirmationApproved (Firestoreトリガー) をデプロイ中..."
gcloud functions deploy onOrderConfirmationApproved \
  --gen2 \
  --runtime=go123 \
  --region=$REGION \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.updated" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters="document=projects/{projectId}" \
  --entry-point=onOrderConfirmationApproved

# 3. onLedgerApproved のデプロイ
echo "🚀 onLedgerApproved (Firestoreトリガー) をデプロイ中..."
gcloud functions deploy onLedgerApproved \
  --gen2 \
  --runtime=go123 \
  --region=$REGION \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.updated" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters="document=ledgerReports/{reportId}" \
  --entry-point=onLedgerApproved

# 4. onLedgerSubmittedToAccounting のデプロイ
echo "🚀 onLedgerSubmittedToAccounting (Firestoreトリガー) をデプロイ中..."
gcloud functions deploy onLedgerSubmittedToAccounting \
  --gen2 \
  --runtime=go123 \
  --region=$REGION \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.updated" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters="document=ledgerReports/{reportId}" \
  --entry-point=onLedgerSubmittedToAccounting

echo "=== デプロイ処理が完了しました ==="
