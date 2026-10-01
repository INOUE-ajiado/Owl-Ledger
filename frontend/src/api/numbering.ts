import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { counterKey, formatDocNumber, type DocNumberKind } from '../utils/numbering';

/**
 * 帳票番号を月ごとの連番で採番する (counters/{種類}{YYYYMM} をトランザクションで +1)。
 * 同時に発行しても番号が重複しない。
 */
export const nextDocNumber = async (kind: DocNumberKind, date: Date = new Date()): Promise<string> => {
  const ref = doc(db, 'counters', counterKey(kind, date));
  const sequence = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists() ? Number(snap.data().value) || 0 : 0) + 1;
    tx.set(ref, { value: next });
    return next;
  });
  return formatDocNumber(kind, date, sequence);
};
