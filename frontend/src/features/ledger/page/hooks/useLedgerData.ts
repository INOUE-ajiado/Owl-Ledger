import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../../api/firebase';
import type { LedgerReport, LedgerSubject, UserPermissions } from '../../../../types';
// import { useAuth } from '../../../../contexts'; // 不要になったため削除

export const useLedgerData = (currentMonth: string, targetUserId: string, isMasterUser: boolean) => {
  // const { user } = useAuth(); // 未使用のため削除
  const [currentReport, setCurrentReport] = useState<LedgerReport | null>(null);
  const [processedReports, setProcessedReports] = useState<LedgerReport[]>([]);
  const [subjects, setSubjects] = useState<LedgerSubject[]>([]);
  const [usersList, setUsersList] = useState<UserPermissions[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. ユーザー一覧取得 (管理者のみ)
  useEffect(() => {
    if (isMasterUser) {
      const unsubscribe = onSnapshot(collection(db, 'permissions'), (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          email: doc.id,
          uid: doc.data().uid,
          permissions: doc.data().permissions
        } as UserPermissions)).filter(u => u.uid);
        setUsersList(usersData);
      });
      return () => unsubscribe();
    }
  }, [isMasterUser]);

  // 2. レポートデータの監視
  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);
    const reportsQuery = query(
        collection(db, 'ledgerReports'), 
        where('userId', '==', targetUserId), 
        where('month', '==', currentMonth), 
        orderBy('reportNumber', 'desc')
    );

    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerReport));
      const draftReport = allReports.find(report => report.status === '作成中');
      const processed = allReports.filter(report => report.status !== '作成中');
      
      setCurrentReport(draftReport || null);
      setProcessedReports(processed);
      setLoading(false);
    }, (error) => {
      console.error("Firestore query error: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentMonth, targetUserId]);

  // 3. 科目データの監視
  useEffect(() => {
    const q = query(collection(db, 'ledgerSubjects'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerSubject)));
    });
    return () => unsubscribe();
  }, []);

  return { currentReport, processedReports, subjects, usersList, loading };
};