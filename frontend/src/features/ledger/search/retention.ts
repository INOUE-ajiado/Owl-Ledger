import { fiscalYearOf } from '../../../utils/period';

/**
 * 帳簿・証憑の保存期限の目安。
 * 取引日の属する事業年度 (4月〜3月) の確定申告期限 (翌事業年度の5月末) から 7 年。
 */
export const retentionDeadline = (entryDate: string): string | null => {
  const fy = fiscalYearOf(entryDate);
  if (fy === null) return null;
  return `${fy + 1 + 7}-05-31`;
};
