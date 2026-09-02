import { useState } from 'react';

interface DeletionReasonModalProps {
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

const DeletionReasonModal = ({ onConfirm, onClose }: DeletionReasonModalProps) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      alert('削除理由を入力してください。');
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium leading-6 text-gray-900">プロジェクトの削除</h3>
        <div className="mt-4">
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
            削除理由を記入してください
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50"
          />
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            削除を実行
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletionReasonModal;