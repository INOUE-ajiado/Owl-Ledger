import type { Project, Vendor } from '../../types';
import { formatYmdDash, parseYmd, projectFinancials } from '../../utils/money';
import { inPeriod, type Period } from '../../utils/period';
import { isVendorBreakdownProject } from '../vendors/vendorStats';

type Resolver = { resolve: (name: string, vendorId?: string) => Vendor | undefined };

export interface GroupMetric {
  key: string;
  label: string;
  count: number;
  sales: number;   // 売上 (税抜)
  margin: number;  // MARGIN (社内配分)
  payout?: number; // 作業者への配分額
  linkTo?: string;
}

const addTo = (map: Map<string, GroupMetric>, key: string, label: string, delta: Partial<GroupMetric>, linkTo?: string) => {
  const row = map.get(key) ?? { key, label, count: 0, sales: 0, margin: 0, payout: 0, linkTo };
  row.count += delta.count ?? 0;
  row.sales += delta.sales ?? 0;
  row.margin += delta.margin ?? 0;
  row.payout = (row.payout ?? 0) + (delta.payout ?? 0);
  map.set(key, row);
};

/**
 * 経営分析の集計。
 * - 版権担当者別: 期間内に受注した案件の売上・MARGIN
 * - 作業者別: 内訳に入っている作業者ごとの配分額と、担当した案件の売上・MARGIN (複数人の案件は配分率で按分)
 * - 見込み: 進行中の案件の売上合計 (期間に関係なく現時点)
 * - 入金予定: 確定済み請求書のお支払期限ごとの金額
 */
export const buildBusinessMetrics = (projects: Project[], period: Period, taxRate: number, vendorIndex: Resolver, today: Date = new Date()) => {
  const salesProjects = projects.filter(p => p.projectType !== 'master');
  const inRange = salesProjects.filter(p => inPeriod(p.registrationDate, period));

  const byManager = new Map<string, GroupMetric>();
  const byWorker = new Map<string, GroupMetric>();
  inRange.forEach(p => {
    const fin = projectFinancials(p, taxRate);
    const manager = p.copyrightManager || '未設定';
    addTo(byManager, manager, manager, { count: 1, sales: fin.glossExclusive, margin: fin.finalMargin });

    if (!isVendorBreakdownProject(p)) return;
    const items = (p.breakdown || []).filter(b => b.name?.trim());
    const totalAmount = items.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    items.forEach(item => {
      const vendor = vendorIndex.resolve(item.name, item.vendorId);
      const share = totalAmount > 0 ? (Number(item.amount) || 0) / totalAmount : 1 / items.length;
      addTo(byWorker, vendor?.id ?? `name:${item.name}`, vendor?.name ?? `${item.name} (未登録)`, {
        count: 1, sales: fin.glossExclusive * share, margin: fin.finalMargin * share, payout: Number(item.amount) || 0,
      }, vendor ? `/vendors/${vendor.id}` : undefined);
    });
  });

  const pipeline = salesProjects.filter(p => p.status === '進行中');
  const uninvoiced = salesProjects.filter(p => p.status === '完了' && !p.isFixed);
  const sumSales = (list: Project[]) => list.reduce((s, p) => s + projectFinancials(p, taxRate).glossExclusive, 0);

  // 入金予定 (お支払期限が今日以降の確定済み請求書) を月ごとに
  const todayKey = formatYmdDash(today);
  const receivables = new Map<string, { month: string; total: number; count: number }>();
  let overdueTotal = 0;
  salesProjects.forEach(p => {
    const data = p.isFixed ? p.fixedInvoiceData : undefined;
    const due = data ? parseYmd(data.dueDate) : null;
    if (!data || !due) return;
    const dueKey = formatYmdDash(due);
    if (dueKey < todayKey) {
      overdueTotal += data.total;
      return;
    }
    const month = dueKey.slice(0, 7);
    const row = receivables.get(month) ?? { month, total: 0, count: 0 };
    row.total += data.total;
    row.count += 1;
    receivables.set(month, row);
  });

  // マスタープロジェクトの予算と実績 (子プロジェクトの捻出額)
  const masters = projects.filter(p => p.projectType === 'master').map(master => {
    const subs = projects.filter(p => p.masterProjectId === master.id);
    const allocated = subs.reduce((s, p) => s + (p.allocatedAmount || 0), 0);
    const actual = subs.filter(p => p.status === '完了' || p.status === '請求済').reduce((s, p) => s + (p.allocatedAmount || 0), 0);
    const budget = master.totalBudget || 0;
    return { master, budget, allocated, actual, remaining: budget - allocated, subCount: subs.length };
  }).sort((a, b) => (b.master.registrationDate || '').localeCompare(a.master.registrationDate || ''));

  const sortRows = (map: Map<string, GroupMetric>) => Array.from(map.values()).sort((a, b) => b.sales - a.sales);

  return {
    byManager: sortRows(byManager),
    byWorker: sortRows(byWorker),
    pipeline: { count: pipeline.length, sales: sumSales(pipeline) },
    uninvoiced: { count: uninvoiced.length, sales: sumSales(uninvoiced) },
    receivables: Array.from(receivables.values()).sort((a, b) => a.month.localeCompare(b.month)),
    overdueTotal,
    masters,
  };
};
