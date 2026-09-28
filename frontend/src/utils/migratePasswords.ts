import { collection, deleteField, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { hashPassword } from './security';

const MIGRATION_KEY = 'owl-ledger:password-hash-migrated-v1';

/**
 * 平文で保存されている旧形式のプレビュー/発注書パスワードをハッシュに置き換える (管理者のみ実行)。
 * ブラウザごとに1回だけ全件を走査する。失敗した場合は次回また実行される。
 */
export const migrateLegacyPasswords = async () => {
  try {
    if (window.localStorage.getItem(MIGRATION_KEY)) return;
  } catch {
    // localStorage が使えない環境では毎回走査する (結果は同じ)
  }

  const projects = await getDocs(collection(db, 'projects'));
  let migrated = 0;

  for (const projectDoc of projects.docs) {
    const plain = projectDoc.data().previewPassword;
    if (typeof plain === 'string' && plain !== '') {
      await updateDoc(projectDoc.ref, {
        previewPasswordHash: await hashPassword(plain, projectDoc.id),
        previewPassword: deleteField(),
      });
      migrated++;
    }

    const pos = await getDocs(collection(db, 'projects', projectDoc.id, 'purchaseOrders'));
    for (const poDoc of pos.docs) {
      const poPlain = poDoc.data().password;
      if (typeof poPlain === 'string' && poPlain !== '') {
        await updateDoc(doc(db, 'projects', projectDoc.id, 'purchaseOrders', poDoc.id), {
          passwordHash: await hashPassword(poPlain, poDoc.id),
          password: deleteField(),
        });
        migrated++;
      }
    }
  }

  try {
    window.localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
  } catch {
    // 保存できなくても動作に影響はない
  }
  if (migrated > 0) console.info(`旧形式のパスワード ${migrated} 件をハッシュに移行しました。`);
};
