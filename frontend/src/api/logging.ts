import { db, auth } from './firebase'; 
import { collection, addDoc, Timestamp } from 'firebase/firestore';

interface LogData {
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  status: 'success' | 'error' | 'info'; 
  details?: string;
}

/**
 * システム実行ログをFirestoreに記録する関数
 * 匿名ユーザーによる閲覧イベントから管理者による操作まで、全てのログを扱います。
 */
export const recordLog = async (data: LogData) => {
  try {
    // ユーザー情報の取得を試行
    let currentUser = auth.currentUser;

    // 匿名認証直後などのタイミングで currentUser が null の場合があるため、最大1秒待機
    if (!currentUser) {
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        currentUser = auth.currentUser;
        if (currentUser) break;
      }
    }

    // 最終的なユーザー情報の確定
    const uid = currentUser?.uid || 'unknown_or_pending_auth';
    const email = currentUser?.email || (currentUser?.isAnonymous ? 'anonymous_visitor' : 'no_email_user');

    // Firestoreへの保存
    await addDoc(collection(db, 'activityLogs'), {
      ...data,
      timestamp: Timestamp.now(),
      userId: uid,
      userEmail: email,
    });
    
  } catch (error) {
    // セキュリティルールやネットワークエラー等による失敗のキャッチ
    console.error("【Log Process】Critical Error: Failed to record activity log.", error);
    
    // ログ自体の失敗がアプリを止めないよう、例外は投げずコンソール出力のみにとどめる
  }
};