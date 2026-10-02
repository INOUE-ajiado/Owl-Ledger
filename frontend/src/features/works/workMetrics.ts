import type {
  CostCategory, DeliveryStatus, LedgerReport, LicenseDeal, Work, WorkCost, WorkMilestone,
} from '../../types';
import { endOfNextMonth, formatYmdDash, parseYmd } from '../../utils/money';

export const COST_CATEGORIES: { id: CostCategory; label: string; hint: string }[] = [
  { id: 'prepro', label: 'プリプロ', hint: '企画・脚本・設定・コンテ' },
  { id: 'animation', label: '作画・仕上・背景・3D', hint: '社内/外注' },
  { id: 'photography', label: '撮影・特効・編集', hint: '' },
  { id: 'sound', label: '音響', hint: 'アフレコスタジオ代・劇伴・効果音' },
  { id: 'production', label: '制作進行諸費', hint: '小口出納・ロケハン・車両交通費' },
];

export const CATEGORY_LABEL = Object.fromEntries(COST_CATEGORIES.map(c => [c.id, c.label])) as Record<CostCategory, string>;

export const DELIVERY_STATUSES: DeliveryStatus[] = ['未着手', '進行中', '納品完了', '検収完了'];

export const episodeLabel = (no: number) => (no > 0 ? `#${String(no).padStart(2, '0')}` : '共通');

export const newId = () => Math.random().toString(36).slice(2, 10);

const emptyBudgets = (): Record<CostCategory, number> => ({ prepro: 0, animation: 0, photography: 0, sound: 0, production: 0 });

/** 新しい作品の初期値 (分割請求の4フェーズ・全12話・重要期日の枠を用意する) */
export const defaultWork = (title: string): Omit<Work, 'id'> => ({
  title,
  status: '企画',
  client: '',
  contractTotal: 0,
  openingBalance: 0,
  originalWork: '',
  publisher: '',
  committee: [],
  ownShare: 0,
  keyDates: ['放送/配信開始日', '初号試写日', '全話完パケ納品日', '契約更新日'].map(label => ({ label, date: '' })),
  contracts: ['製作受託契約書', '原作使用許諾書', 'メインスタッフ契約書'].map(name => ({ id: newId(), name, url: '' })),
  milestones: [
    { name: '契約時 (着手金)', deliverable: '契約締結', trigger: '納品完了' as const },
    { name: 'コンテ/設定UP', deliverable: '全話コンテ・設定', trigger: '検収完了' as const },
    { name: 'アフレコ/中間', deliverable: 'アフレコ完了', trigger: '検収完了' as const },
    { name: '完パケ/納品', deliverable: '本編納品', trigger: '検収完了' as const },
  ].map(m => ({ ...m, id: newId(), amount: 0, plannedDate: '', deliveryStatus: '未着手' as const, invoiceStatus: '未起票' as const })),
  categoryBudgets: emptyBudgets(),
  episodes: Array.from({ length: 12 }, (_, i) => ({ no: i + 1, budget: 0 })),
  licenses: [],
  remarks: '',
});

// ---- 資金回収・マイルストーン ----

const DELIVERY_RANK: Record<DeliveryStatus, number> = { '未着手': 0, '進行中': 1, '納品完了': 2, '検収完了': 3 };

/**
 * 節目の納品ステータスを更新する。トリガー (納品完了/検収完了) に達し、請求書が未起票なら
 * 下書きを起票する (発行日=今日、入金予定日=翌月末)。
 */
export const applyDeliveryStatus = (milestones: WorkMilestone[], id: string, status: DeliveryStatus, today: Date) =>
  milestones.map(m => {
    if (m.id !== id) return m;
    const next: WorkMilestone = { ...m, deliveryStatus: status };
    if (DELIVERY_RANK[status] >= DELIVERY_RANK[m.trigger] && m.invoiceStatus === '未起票') {
      next.invoiceStatus = '下書き';
      next.issueDate = formatYmdDash(today);
      next.dueDate = m.dueDate || formatYmdDash(endOfNextMonth(today));
    }
    return next;
  });

export interface BillingSummary {
  contractTotal: number;
  scheduled: number; // 節目に割り振った額
  draft: number;
  invoiced: number;  // 発行済 + 入金済
  paid: number;
  unbilled: number;  // 契約総額のうち未請求
  outstanding: number; // 請求済みで未入金
  overdue: WorkMilestone[];
}

export const billingSummary = (work: Pick<Work, 'contractTotal' | 'milestones'>, today: Date): BillingSummary => {
  const sum = (pred: (m: WorkMilestone) => boolean) => work.milestones.filter(pred).reduce((s, m) => s + (m.amount || 0), 0);
  const invoiced = sum(m => m.invoiceStatus === '発行済' || m.invoiceStatus === '入金済');
  const paid = sum(m => m.invoiceStatus === '入金済');
  const todayStr = formatYmdDash(today);
  return {
    contractTotal: work.contractTotal || 0,
    scheduled: sum(() => true),
    draft: sum(m => m.invoiceStatus === '下書き'),
    invoiced,
    paid,
    unbilled: Math.max(0, (work.contractTotal || 0) - invoiced),
    outstanding: invoiced - paid,
    overdue: work.milestones.filter(m => m.invoiceStatus === '発行済' && !!m.dueDate && m.dueDate < todayStr),
  };
};

// ---- 原価予実 ----

/** 予実の集計に使う支出1件 (作品の原価レコード、または出納帳の明細) */
export interface CostItem {
  date: string;
  category: CostCategory;
  episode: number;
  amount: number;
  income: number;
  source: 'cost' | 'ledger';
  label: string;
  paid: boolean;
}

export const costItemsFromCosts = (costs: WorkCost[]): CostItem[] => costs.map(c => ({
  date: c.date, category: c.category, episode: c.episode || 0, amount: c.amount || 0, income: 0,
  source: 'cost', label: [c.payee, c.description].filter(Boolean).join(' / '), paid: c.paid,
}));

/** 出納帳のうち、この作品に紐付いた明細 (出金は原価、入金はキャッシュインとして扱う) */
export const costItemsFromLedger = (reports: LedgerReport[], workId: string): CostItem[] =>
  reports.flatMap(r => (r.entries ?? [])
    .filter(e => e.workId === workId)
    .map(e => ({
      date: e.date, category: e.costCategory ?? 'production', episode: e.episode || 0,
      amount: e.expense || 0, income: e.income || 0, source: 'ledger' as const,
      label: [e.payee, e.description].filter(Boolean).join(' / '), paid: true,
    })));

export interface BudgetRow<K> {
  key: K;
  budget: number;
  actual: number;
  rate: number | null; // 消化率 (予算0は null)
  status: 'ok' | 'warn' | 'over';
}

const budgetStatus = (budget: number, actual: number): BudgetRow<unknown>['status'] => {
  if (budget <= 0) return actual > 0 ? 'over' : 'ok';
  if (actual > budget) return 'over';
  return actual >= budget * 0.9 ? 'warn' : 'ok';
};

const toRow = <K,>(key: K, budget: number, actual: number): BudgetRow<K> => ({
  key, budget, actual, rate: budget > 0 ? actual / budget : null, status: budgetStatus(budget, actual),
});

export const categoryBreakdown = (work: Pick<Work, 'categoryBudgets'>, items: CostItem[]) =>
  COST_CATEGORIES.map(c => toRow(c.id, work.categoryBudgets?.[c.id] || 0,
    items.filter(i => i.category === c.id).reduce((s, i) => s + i.amount, 0)));

/** 話数別の予算消化。予算未設定でもコストが付いた話数は表示する */
export const episodeBreakdown = (work: Pick<Work, 'episodes'>, items: CostItem[]) => {
  const nos = new Set([...work.episodes.map(e => e.no), ...items.map(i => i.episode).filter(n => n > 0)]);
  return Array.from(nos).sort((a, b) => a - b).map(no => toRow(no,
    work.episodes.find(e => e.no === no)?.budget || 0,
    items.filter(i => i.episode === no).reduce((s, i) => s + i.amount, 0)));
};

// ---- ライセンス・MG ----

export interface LicenseSummary {
  earned: number;       // 報告されたロイヤリティ累計
  mgConsumed: number;   // MG のうち消化済み
  mgRemaining: number;
  overage: number;      // MG を超えた分 (ランニングロイヤリティとして請求)
  overageByReport: Record<string, number>;
  billableReports: number; // 報告書を受領済み・MG超過分あり・未請求
  supervisionBillable: boolean;
}

export const licenseSummary = (deal: LicenseDeal): LicenseSummary => {
  const mg = deal.mg || 0;
  let cumulative = 0;
  const overageByReport: Record<string, number> = {};
  [...deal.reports].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).forEach(r => {
    const before = Math.max(0, cumulative - mg);
    cumulative += r.amount || 0;
    overageByReport[r.id] = Math.max(0, cumulative - mg) - before;
  });
  return {
    earned: cumulative,
    mgConsumed: Math.min(cumulative, mg),
    mgRemaining: Math.max(0, mg - cumulative),
    overage: Math.max(0, cumulative - mg),
    overageByReport,
    billableReports: deal.reports.filter(r => r.received && !r.invoiced && overageByReport[r.id] > 0).length,
    supervisionBillable: deal.supervision === '監修OK' && !deal.supervisionInvoiced,
  };
};

// ---- キャッシュギャップ ----

export interface CashMonth {
  month: string; // YYYY-MM
  cashIn: number;
  cashOut: number;
  balance: number; // 手元資金 + 累計 (入金 - 出金)
}

export interface CashFlow {
  months: CashMonth[];
  peak: CashMonth | null; // 残高が最も低い月 (マイナスなら持ち出し)
}

const monthOf = (date: string) => (parseYmd(date) ? date.slice(0, 7).replace('/', '-') : '');

const addMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

/**
 * 作品単体の月次キャッシュイン/アウト。
 * 入金: 節目の請求 (入金済は入金日、それ以外は入金予定日→予定日の翌月末)、MG、MG超過のロイヤリティ。
 * 出金: 原価レコード・出納帳の出金。
 */
export const cashFlow = (work: Pick<Work, 'milestones' | 'licenses' | 'openingBalance'>, items: CostItem[]): CashFlow => {
  const ins: { date: string; amount: number }[] = [];
  work.milestones.forEach(m => {
    const planned = parseYmd(m.plannedDate);
    const date = m.invoiceStatus === '入金済' && m.paidDate ? m.paidDate
      : m.dueDate || (planned ? formatYmdDash(endOfNextMonth(planned)) : '');
    if (date && m.amount) ins.push({ date, amount: m.amount });
  });
  work.licenses.forEach(deal => {
    if (deal.mgDueDate && deal.mg) ins.push({ date: deal.mgDueDate, amount: deal.mg });
    const { overageByReport } = licenseSummary(deal);
    deal.reports.forEach(r => {
      const date = r.paid && r.paidDate ? r.paidDate : r.dueDate;
      if (date && overageByReport[r.id]) ins.push({ date, amount: overageByReport[r.id] });
    });
  });
  items.forEach(i => { if (i.income) ins.push({ date: i.date, amount: i.income }); });
  const outs = items.filter(i => i.amount).map(i => ({ date: i.date, amount: i.amount }));

  const byMonth = new Map<string, { cashIn: number; cashOut: number }>();
  const add = (date: string, key: 'cashIn' | 'cashOut', amount: number) => {
    const month = monthOf(date);
    if (!month) return;
    const row = byMonth.get(month) ?? { cashIn: 0, cashOut: 0 };
    row[key] += amount;
    byMonth.set(month, row);
  };
  ins.forEach(e => add(e.date, 'cashIn', e.amount));
  outs.forEach(e => add(e.date, 'cashOut', e.amount));
  if (byMonth.size === 0) return { months: [], peak: null };

  // 動きのない月も埋めて、時系列を連続させる
  const keys = Array.from(byMonth.keys()).sort();
  const months: CashMonth[] = [];
  let balance = work.openingBalance || 0;
  for (let month = keys[0]; month <= keys[keys.length - 1]; month = addMonth(month)) {
    const row = byMonth.get(month) ?? { cashIn: 0, cashOut: 0 };
    balance += row.cashIn - row.cashOut;
    months.push({ month, ...row, balance });
  }
  const peak = months.reduce((low, m) => (m.balance < low.balance ? m : low), months[0]);
  return { months, peak };
};

/** 今日から期日までの日数 (過ぎていればマイナス) */
export const daysUntil = (date: string, today: Date) => {
  const target = parseYmd(date);
  if (!target) return null;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
};
