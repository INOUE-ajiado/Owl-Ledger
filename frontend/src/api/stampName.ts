import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * 提出・承認印に入れる名前を決める。
 * ログイン中の社員は社員マスタの「印鑑名」、ログインせずに承認した人は会社設定の承認者名を使う。
 */
export const resolveStampName = async (anonymousFallback: string): Promise<string> => {
  const email = auth.currentUser?.email;
  if (!email) return anonymousFallback || '承認者';
  try {
    const snap = await getDocs(query(collection(db, 'staff'), where('email', '==', email.toLowerCase())));
    const stampName = snap.docs[0]?.data().stampName as string | undefined;
    if (stampName) return stampName;
  } catch (error) {
    console.error('社員マスタの取得に失敗しました:', error);
  }
  return email.split('@')[0];
};
