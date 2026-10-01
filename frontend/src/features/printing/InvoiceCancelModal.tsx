import { useState } from 'react';

interface InvoiceCancelModalProps {
  invoiceNumber: string;
  onClose: () => void;
  onConfirm: (reason: string, withCreditNote: boolean) => Promise<void>;
}

/** 確定済み請求書の取消 (理由の入力と赤伝の発行有無) */
const InvoiceCancelModal = ({ invoiceNumber, onClose, onConfirm }: InvoiceCancelModalProps) => {
  const [reason, setReason] = useState('');
  const [withCreditNote, setWithCreditNote] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim(), withCreditNote);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 no-print">
      <div className="w-full max-w-lg p-6 text-left text-gray-800 bg-white rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold">請求書の取消</h3>
        <p className="mt-2 text-sm text-gray-600">
          請求書番号 <span className="font-mono font-semibold">{invoiceNumber}</span> を取り消します。
          取り消した請求書は履歴に残り、プロジェクトは編集・再発行できる状態 (ステータス「完了」) に戻ります。
        </p>
        <label className="block mt-4 text-sm font-medium">取消理由 <span className="text-red-500">*</span></label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" placeholder="例: 金額の訂正のため" />
        <label className="flex items-start gap-2 mt-4 text-sm">
          <input type="checkbox" checked={withCreditNote} onChange={e => setWithCreditNote(e.target.checked)} className="mt-0.5" />
          <span>
            赤伝 (マイナスの請求書) を発行する
            <span className="block text-xs text-gray-500">先方に送付済みの請求書を打ち消す場合に使います。</span>
          </span>
        </label>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
          <button type="button" onClick={handleSubmit} disabled={!reason.trim() || submitting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300">
            {submitting ? '処理中...' : '取消する'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCancelModal;
