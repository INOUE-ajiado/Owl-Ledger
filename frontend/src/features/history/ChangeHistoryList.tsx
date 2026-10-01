import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { ChangeHistory } from '../../types';
import { ACTION_LABELS, TARGET_LABELS } from './labels';

const formatTimestamp = (ts: ChangeHistory['timestamp']) =>
  new Date(ts.seconds * 1000).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/** 変更履歴 1 件 (項目ごとの変更前 → 変更後) */
export const ChangeHistoryItem = ({ item, showTarget = true }: { item: ChangeHistory; showTarget?: boolean }) => (
  <li className="px-4 py-3">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <span className="text-xs text-gray-500 tabular-nums">{formatTimestamp(item.timestamp)}</span>
      <span className={`px-1.5 text-xs font-semibold rounded ${item.action === 'delete' ? 'bg-red-100 text-red-700' : item.action === 'create' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
        {ACTION_LABELS[item.action]}
      </span>
      {showTarget && <span className="font-medium text-gray-900">{TARGET_LABELS[item.targetType] ?? item.targetType}: {item.targetLabel}</span>}
      <span className="text-xs text-gray-500">{item.userEmail}</span>
    </div>
    {item.changes.length > 0 && (
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="text-left text-gray-500"><tr><th className="py-1 pr-3 font-medium">項目</th><th className="py-1 pr-3 font-medium">変更前</th><th className="py-1 font-medium">変更後</th></tr></thead>
          <tbody className="align-top">
            {item.changes.map((c, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-1 pr-3 font-mono text-gray-600 whitespace-nowrap">{c.field}</td>
                <td className="py-1 pr-3 text-red-700 break-all line-through decoration-red-300">{c.before}</td>
                <td className="py-1 text-green-800 break-all">{c.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </li>
);

/** 指定したデータの変更履歴をモーダルで表示する (管理者のみ読める) */
export const ChangeHistoryModal = ({ targetId, title, onClose }: { targetId: string; title: string; onClose: () => void }) => {
  const [items, setItems] = useState<ChangeHistory[] | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, 'changeHistory'), where('targetId', '==', targetId)))
      .then(snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangeHistory)).sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)))
      .catch(error => {
        console.error('変更履歴の取得に失敗しました:', error);
        setItems([]);
      });
  }, [targetId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-black bg-opacity-50 sm:p-4" onClick={onClose}>
      <div className="flex flex-col w-full max-w-3xl max-h-[85vh] bg-white rounded-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">変更履歴: {title}</h3>
          <button onClick={onClose} className="px-3 py-1 text-sm bg-white border rounded-md">閉じる</button>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y">
          {items === null && <li className="p-6 text-sm text-center text-gray-500">読み込み中...</li>}
          {items?.length === 0 && <li className="p-6 text-sm text-center text-gray-500">変更履歴はありません。</li>}
          {items?.map(item => <ChangeHistoryItem key={item.id} item={item} showTarget={false} />)}
        </ul>
      </div>
    </div>
  );
};
