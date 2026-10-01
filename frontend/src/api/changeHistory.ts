import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { diffObjects } from '../utils/diff';
import type { ChangeHistory, FieldChange } from '../types';

interface ChangeInput {
  targetType: ChangeHistory['targetType'];
  targetId: string;
  targetLabel: string;
  action: ChangeHistory['action'];
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  changes?: FieldChange[]; // 差分を自前で作る場合
  ignoreKeys?: string[];
}

const MAX_CHANGES = 200;

/**
 * 変更履歴 (誰が・いつ・どの項目を・何から何へ) を記録する。
 * 監査用の記録なので、失敗しても元の操作は止めない。
 */
export const recordChange = async (input: ChangeInput) => {
  try {
    const changes = (input.changes ?? diffObjects(input.before, input.after, input.ignoreKeys)).slice(0, MAX_CHANGES);
    if (input.action === 'update' && changes.length === 0) return;

    const user = auth.currentUser;
    await addDoc(collection(db, 'changeHistory'), {
      timestamp: Timestamp.now(),
      userId: user?.uid ?? '',
      userEmail: user?.email || (user?.isAnonymous ? 'anonymous_visitor' : 'no_email_user'),
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel.slice(0, 200),
      action: input.action,
      changes,
    });
  } catch (error) {
    console.error('変更履歴の記録に失敗しました:', error);
  }
};
