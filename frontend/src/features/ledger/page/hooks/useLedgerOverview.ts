import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../api/firebase';
import type { LedgerReport } from '../../../../types';

export type MonthOverview = Record<string, LedgerReport['status'][]>;

/**
 * 月ナビゲーター用に、対象ユーザーの全レポートの「月 → ステータス一覧」を監視する。
 * 複合インデックスを増やさないよう userId の等価条件のみでクエリし、集計はクライアント側で行う。
 */
export const useLedgerOverview = (targetUserId: string) => {
  const [overview, setOverview] = useState<MonthOverview>({});

  useEffect(() => {
    if (!targetUserId) return;
    const q = query(collection(db, 'ledgerReports'), where('userId', '==', targetUserId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next: MonthOverview = {};
      snapshot.docs.forEach(d => {
        const { month, status } = d.data() as LedgerReport;
        if (!month) return;
        (next[month] ??= []).push(status);
      });
      setOverview(next);
    }, (error) => {
      console.error("Firestore overview query error: ", error);
    });
    return () => unsubscribe();
  }, [targetUserId]);

  return overview;
};
