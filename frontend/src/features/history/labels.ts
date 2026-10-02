import type { ChangeHistory } from '../../types';

export const ACTION_LABELS: Record<ChangeHistory['action'], string> = { create: '作成', update: '変更', delete: '削除' };

export const TARGET_LABELS: Record<ChangeHistory['targetType'], string> = {
  project: 'プロジェクト', client: 'クライアント', vendor: '外注先', ledger: '出納帳',
  settings: '会社設定', staff: '社員', permissions: '権限', invoice: '請求書', work: '作品',
};
