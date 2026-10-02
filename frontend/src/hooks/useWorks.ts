import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useCollection } from './useCollection';
import { defaultWork } from '../features/works/workMetrics';
import type { Work, WorkCost } from '../types';

// 項目を追加しても古い作品が壊れないよう、初期値で欠けた項目を補う
const withDefaults = (id: string, data: Partial<Work>): Work => {
  const base = defaultWork(data.title ?? '');
  return { ...base, ...data, id, categoryBudgets: { ...base.categoryBudgets, ...data.categoryBudgets } };
};

/** 作品一覧 (タイトル順) */
export const useWorks = (enabled = true) => {
  const { items, loading } = useCollection<Work>('works', enabled);
  const works = useMemo(() => items.map(w => withDefaults(w.id, w)).sort((a, b) => a.title.localeCompare(b.title, 'ja')), [items]);
  return { works, loading };
};

/** 作品1件 */
export const useWork = (workId: string | undefined) => {
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!workId) return;
    return onSnapshot(doc(db, 'works', workId), (snap) => {
      setWork(snap.exists() ? withDefaults(snap.id, snap.data() as Partial<Work>) : null);
      setLoading(false);
    }, (error) => {
      console.error('作品の読み込みに失敗しました:', error);
      setLoading(false);
    });
  }, [workId]);
  return { work, loading };
};

/** 作品の原価レコード (支払日順) */
export const useWorkCosts = (workId: string | undefined) => {
  const { items, loading } = useCollection<WorkCost>(`works/${workId}/costs`, !!workId);
  const costs = useMemo(() => [...items].sort((a, b) => (a.date || '').localeCompare(b.date || '')), [items]);
  return { costs, loading };
};
