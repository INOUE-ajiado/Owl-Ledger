import type { LedgerReport } from '../../../types';

/** ローカル時刻基準で YYYY-MM を返す（toISOString は UTC のため月初早朝に前月になる） */
export const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const shiftMonth = (month: string, amount: number) => {
  const [y, m] = month.split('-').map(Number);
  return toMonthKey(new Date(y, m - 1 + amount, 1));
};

export const formatMonthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${y}年${m}月`;
};

export const formatYen = (value: number) => `¥${new Intl.NumberFormat('ja-JP').format(value)}`;

export const sumEntries = (report: LedgerReport) => {
  const income = report.entries.reduce((sum, e) => sum + (e.income || 0), 0);
  const expense = report.entries.reduce((sum, e) => sum + (e.expense || 0), 0);
  return { income, expense, balance: income - expense };
};

export const STATUS_STYLES: Record<LedgerReport['status'], { badge: string; dot: string }> = {
  '作成中': { badge: 'bg-earth-100 text-earth-800', dot: 'bg-earth-500' },
  '承認待ち': { badge: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  '承認済み': { badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  '経理提出済み': { badge: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
};
