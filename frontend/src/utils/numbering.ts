// 帳票番号の種類: 見積書 Q / 請求書 I / 赤伝 (取消請求書) C / 発注書 P
export type DocNumberKind = 'Q' | 'I' | 'C' | 'P';

export const counterKey = (kind: DocNumberKind, date: Date) =>
  `${kind}${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

/** 例: I202610-0003 */
export const formatDocNumber = (kind: DocNumberKind, date: Date, sequence: number) =>
  `${counterKey(kind, date)}-${String(sequence).padStart(4, '0')}`;
