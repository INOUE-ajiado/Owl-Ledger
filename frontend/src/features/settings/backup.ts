import { collection, collectionGroup, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../api/firebase';

// 全データバックアップの対象 (通知は本人しか読めないため対象外)
export const BACKUP_COLLECTIONS = [
  'settings', 'staff', 'permissions', 'clients', 'vendors', 'projects', 'ledgerReports',
  'ledgerSubjects', 'counters', 'changeHistory', 'activityLogs', 'works',
] as const;

/** Firestore の値を JSON にできる形へ (Timestamp は ISO 文字列にして型を残す) */
export const toJsonValue = (value: unknown): unknown => {
  if (value instanceof Timestamp) return { __type: 'timestamp', value: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toJsonValue(v)]));
  }
  return value;
};

export interface BackupFile {
  format: 'owl-ledger-backup';
  version: 1;
  exportedAt: string;
  collections: Record<string, Record<string, unknown>>;
  // 発注書はプロジェクトのサブコレクション (パス → データ)
  purchaseOrders: Record<string, unknown>;
  // 作品の原価明細 (works/{id}/costs。パス → データ)
  workCosts?: Record<string, unknown>;
}

export const buildBackup = async (onProgress?: (label: string) => void): Promise<BackupFile> => {
  const collections: BackupFile['collections'] = {};
  for (const name of BACKUP_COLLECTIONS) {
    onProgress?.(name);
    const snap = await getDocs(collection(db, name));
    collections[name] = Object.fromEntries(snap.docs.map(d => [d.id, toJsonValue(d.data())]));
  }
  onProgress?.('purchaseOrders');
  const poSnap = await getDocs(collectionGroup(db, 'purchaseOrders'));
  const purchaseOrders = Object.fromEntries(poSnap.docs.map(d => [d.ref.path, toJsonValue(d.data())]));
  onProgress?.('workCosts');
  const costSnap = await getDocs(collectionGroup(db, 'costs'));
  const workCosts = Object.fromEntries(costSnap.docs.map(d => [d.ref.path, toJsonValue(d.data())]));
  return { format: 'owl-ledger-backup', version: 1, exportedAt: new Date().toISOString(), collections, purchaseOrders, workCosts };
};

export const downloadJson = (data: unknown, fileName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
