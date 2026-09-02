import { useState } from 'react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { Project } from '../../types';
import { useModal } from '../../contexts'; // ★ 修正: contextsからインポート

interface PasswordModalProps {
  project: Project;
  onClose: () => void;
}

const PasswordModal = ({ project, onClose }: PasswordModalProps) => {
  const [password, setPassword] = useState(project.previewPassword || '');
  const { showModal } = useModal();

  const handleSave = async () => {
    if (!password) {
      handleRemove();
      return;
    }
    const projectRef = doc(db, 'projects', project.id);
    try {
      await updateDoc(projectRef, { previewPassword: password });
      showModal({ title: '成功', message: 'パスワードを設定しました。' });
      onClose();
    } catch (error) {
      console.error("Failed to set password:", error); // ★ 修正: エラーを出力
      showModal({ title: 'エラー', message: '設定に失敗しました。' });
    }
  };

  const handleRemove = async () => {
    const projectRef = doc(db, 'projects', project.id);
    try {
      await updateDoc(projectRef, { previewPassword: deleteField() });
      showModal({ title: '成功', message: 'パスワードを解除しました。' });
      onClose();
    } catch (error) {
      console.error("Failed to remove password:", error); // ★ 修正: エラーを出力
      showModal({ title: 'エラー', message: '解除に失敗しました。' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-xl">
        <h3 className="mb-2 text-lg font-medium leading-6 text-gray-900">パスワード設定</h3>
        <p className="mb-4 text-sm text-gray-500">{project.title}</p>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            プレビュー用パスワード
          </label>
          <input
            type="text"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm bg-gray-50"
            placeholder="空欄で保存すると解除されます"
          />
        </div>
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={handleRemove}
            className="text-sm text-gray-600 hover:text-red-600 disabled:opacity-50"
            disabled={!project.previewPassword}
          >
            パスワードを解除
          </button>
          <div className="space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
              キャンセル
            </button>
            <button type="button" onClick={handleSave} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;