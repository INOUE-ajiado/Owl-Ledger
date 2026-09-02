import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { Project } from '../../types';

interface DeletionHistoryModalProps {
  onClose: () => void;
  onViewDetails: (project: Project) => void;
}

const formatDate = (timestamp: { seconds: number; nanoseconds: number; } | undefined) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString('ja-JP');
};

const DeletionHistoryModal = ({ onClose, onViewDetails }: DeletionHistoryModalProps) => {
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'projects'), 
      where('status', '==', '削除済み'),
      orderBy('deletedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setDeletedProjects(projects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">削除履歴</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {loading ? (
            <p>読み込み中...</p>
          ) : deletedProjects.length === 0 ? (
            <p>削除されたプロジェクトはありません。</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">削除日</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">作品名</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">削除理由</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deletedProjects.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">{formatDate(p.deletedAt)}</td>
                    <td className="px-4 py-2">{p.title} ({p.projectId})</td>
                    <td className="px-4 py-2 whitespace-pre-wrap">{p.deletionReason}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => onViewDetails(p)} className="text-indigo-600 hover:underline">詳細</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletionHistoryModal;