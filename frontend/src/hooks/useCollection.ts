import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, type QueryConstraint } from 'firebase/firestore';
import { db } from '../api/firebase';

/** コレクションを購読して `{ id, ...data }` の配列で返す */
export const useCollection = <T extends { id: string }>(path: string, enabled = true, ...constraints: QueryConstraint[]) => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = onSnapshot(query(collection(db, path), ...constraints), (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T)));
      setLoading(false);
    }, (error) => {
      console.error(`${path} の読み込みに失敗しました:`, error);
      setLoading(false);
    });
    return () => unsubscribe();
    // 条件は呼び出し側で固定のものだけを渡す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled]);

  return { items, loading };
};
