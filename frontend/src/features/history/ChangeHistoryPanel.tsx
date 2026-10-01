import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { ChangeHistory } from '../../types';
import { ChangeHistoryItem } from './ChangeHistoryList';
import { TARGET_LABELS } from './labels';

const PAGE_SIZE = 300;

/** 変更履歴の一覧 (新しい順・種類と文字で絞り込み) */
const ChangeHistoryPanel = () => {
  const [items, setItems] = useState<ChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(PAGE_SIZE);
  const [targetType, setTargetType] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'changeHistory'), orderBy('timestamp', 'desc'), limit(count));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangeHistory)));
      setLoading(false);
    }, (error) => {
      console.error('変更履歴の読み込みに失敗しました:', error);
      setLoading(false);
    });
  }, [count]);

  const filtered = useMemo(() => {
    const keyword = text.trim().toLowerCase();
    return items.filter(item =>
      (!targetType || item.targetType === targetType) &&
      (!keyword || [item.targetLabel, item.userEmail, ...item.changes.flatMap(c => [c.field, c.before, c.after])]
        .some(v => (v ?? '').toLowerCase().includes(keyword))));
  }, [items, targetType, text]);

  return (
    <div className="bg-white/40 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/30">
        <select value={targetType} onChange={e => setTargetType(e.target.value)} className="py-1.5 text-sm border-gray-300 rounded-md">
          <option value="">すべての種類</option>
          {Object.entries(TARGET_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="名前・項目・値・ユーザーで検索" className="flex-1 min-w-[12rem] py-1.5 text-sm border-gray-300 rounded-md" />
        <span className="text-xs text-earth-600">{filtered.length}件 / 最新 {items.length}件</span>
      </div>
      <ul className="divide-y divide-gray-200/60">
        {loading && <li className="p-8 text-sm text-center text-gray-500">読み込み中...</li>}
        {!loading && filtered.length === 0 && <li className="p-8 text-sm text-center text-gray-500">変更履歴はありません。</li>}
        {filtered.map(item => <ChangeHistoryItem key={item.id} item={item} />)}
      </ul>
      {items.length >= count && (
        <div className="p-4 text-center">
          <button onClick={() => setCount(c => c + PAGE_SIZE)} className="px-4 py-2 text-sm bg-white border rounded-md">さらに読み込む</button>
        </div>
      )}
    </div>
  );
};

export default ChangeHistoryPanel;
