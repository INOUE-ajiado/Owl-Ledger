import { describe, expect, test } from 'vitest';
import {
  applyDeliveryStatus, billingSummary, cashFlow, categoryBreakdown, costItemsFromLedger, daysUntil,
  defaultWork, episodeBreakdown, licenseSummary, type CostItem,
} from './workMetrics';
import { defaultBudgetSheet } from './budgetSheet';
import type { LedgerReport, LicenseDeal, WorkMilestone } from '../../types';

const today = new Date(2026, 9, 2);

const milestone = (overrides: Partial<WorkMilestone>): WorkMilestone => ({
  id: 'm', name: 'M', deliverable: '', amount: 0, plannedDate: '', deliveryStatus: '未着手',
  trigger: '検収完了', invoiceStatus: '未起票', ...overrides,
});

const item = (overrides: Partial<CostItem>): CostItem => ({
  date: '2026-10-10', category: 'animation', episode: 0, amount: 0, income: 0, source: 'cost', label: '', paid: false, ...overrides,
});

const deal = (overrides: Partial<LicenseDeal>): LicenseDeal => ({
  id: 'l', channel: '商品化', licensee: 'A社', title: 'グッズ', mg: 0, mgPaid: false, supervision: '対象外',
  supervisionInvoiced: false, reports: [], ...overrides,
});

describe('applyDeliveryStatus', () => {
  test('トリガーに達すると請求書の下書きを起票する (入金予定日は翌月末)', () => {
    const result = applyDeliveryStatus([milestone({ id: 'a' })], 'a', '検収完了', today);
    expect(result[0]).toMatchObject({ deliveryStatus: '検収完了', invoiceStatus: '下書き', issueDate: '2026-10-02', dueDate: '2026-11-30' });
  });

  test('トリガー前の状態では起票しない', () => {
    const result = applyDeliveryStatus([milestone({ id: 'a' })], 'a', '納品完了', today);
    expect(result[0].invoiceStatus).toBe('未起票');
  });

  test('トリガーが納品完了なら、検収完了に飛ばしても起票する', () => {
    const result = applyDeliveryStatus([milestone({ id: 'a', trigger: '納品完了' })], 'a', '検収完了', today);
    expect(result[0].invoiceStatus).toBe('下書き');
  });

  test('発行済みの請求書は書き換えない', () => {
    const result = applyDeliveryStatus([milestone({ id: 'a', invoiceStatus: '発行済', issueDate: '2026-09-01' })], 'a', '検収完了', today);
    expect(result[0]).toMatchObject({ invoiceStatus: '発行済', issueDate: '2026-09-01' });
  });
});

describe('billingSummary', () => {
  test('請求済み・入金済み・未請求残高と入金遅延を集計する', () => {
    const summary = billingSummary({
      contractTotal: 1000,
      milestones: [
        milestone({ amount: 300, invoiceStatus: '入金済' }),
        milestone({ amount: 200, invoiceStatus: '発行済', dueDate: '2026-09-30' }),
        milestone({ amount: 200, invoiceStatus: '下書き' }),
        milestone({ amount: 300 }),
      ],
    }, today);
    expect(summary).toMatchObject({ invoiced: 500, paid: 300, unbilled: 500, outstanding: 200, draft: 200, scheduled: 1000 });
    expect(summary.overdue).toHaveLength(1);
  });
});

describe('予実', () => {
  test('工程別・話数別に消化額と予算超過を判定する', () => {
    const items = [item({ category: 'animation', episode: 3, amount: 950 }), item({ category: 'sound', episode: 7, amount: 1200 })];
    const budgetSheet = { ...defaultBudgetSheet(), basis: 'series' as const, sections: [
      { id: 'animation', name: '作画', lines: [{ id: 'a', name: '原画', calc: '', amount: 1000 }] },
      { id: 'sound', name: '音響', lines: [{ id: 'b', name: 'スタジオ', calc: '', amount: 1000 }] },
    ] };
    const categories = categoryBreakdown({ budgetSheet, episodes: [] }, [...items, item({ category: 'gone', amount: 5 })]);
    expect(categories.find(r => r.key === 'animation')).toMatchObject({ actual: 950, status: 'warn', label: '作画' });
    expect(categories.find(r => r.key === 'sound')).toMatchObject({ actual: 1200, status: 'over' });
    expect(categories.at(-1)).toMatchObject({ label: '未分類', actual: 5 });

    // 1話あたりの予算表は話数倍してシリーズの予算にする
    const perEpisode = categoryBreakdown({ budgetSheet: { ...budgetSheet, basis: 'episode' }, episodes: [{ no: 1, budget: 0 }, { no: 2, budget: 0 }] }, items);
    expect(perEpisode.find(r => r.key === 'animation')?.budget).toBe(2000);

    const episodes = episodeBreakdown({ episodes: [{ no: 3, budget: 1000 }] }, items);
    expect(episodes.map(r => [r.key, r.status])).toEqual([[3, 'warn'], [7, 'over']]);
  });

  test('出納帳はこの作品に紐付いた明細だけを拾う', () => {
    const reports = [{
      entries: [
        { id: '1', date: '2026-10-01', subject: [], description: 'ロケハン', payee: '', income: 0, expense: 5000, workId: 'w1', episode: 2 },
        { id: '2', date: '2026-10-01', subject: [], description: '別作品', payee: '', income: 0, expense: 9000, workId: 'w2' },
      ],
    }] as unknown as LedgerReport[];
    const items = costItemsFromLedger(reports, 'w1');
    expect(items).toEqual([expect.objectContaining({ amount: 5000, episode: 2, category: 'production', source: 'ledger' })]);
  });
});

describe('licenseSummary', () => {
  test('MG を消化しきった後の超過分だけをロイヤリティとして請求する', () => {
    const summary = licenseSummary(deal({
      mg: 1000,
      supervision: '監修OK',
      reports: [
        { id: 'r2', period: 'Q2', dueDate: '2026-07-31', amount: 600, received: true, invoiced: false, paid: false },
        { id: 'r1', period: 'Q1', dueDate: '2026-04-30', amount: 700, received: true, invoiced: false, paid: false },
      ],
    }));
    expect(summary).toMatchObject({ earned: 1300, mgConsumed: 1000, mgRemaining: 0, overage: 300, billableReports: 1, supervisionBillable: true });
    expect(summary.overageByReport).toEqual({ r1: 0, r2: 300 });
  });
});

describe('cashFlow', () => {
  test('月次の入出金を重ね、残高が最も低い月を返す (動きのない月も埋める)', () => {
    const flow = cashFlow({
      openingBalance: 100,
      milestones: [
        milestone({ amount: 500, invoiceStatus: '入金済', paidDate: '2026-10-15' }),
        milestone({ amount: 1000, plannedDate: '2026-11-10' }), // 予定日の翌月末 = 12月
      ],
      licenses: [],
    }, [
      item({ date: '2026-10-20', amount: 400 }),
      item({ date: '2026-11-20', amount: 800 }),
    ]);
    expect(flow.months).toEqual([
      { month: '2026-10', cashIn: 500, cashOut: 400, balance: 200 },
      { month: '2026-11', cashIn: 0, cashOut: 800, balance: -600 },
      { month: '2026-12', cashIn: 1000, cashOut: 0, balance: 400 },
    ]);
    expect(flow.peak?.month).toBe('2026-11');
  });

  test('データがなければ空', () => {
    expect(cashFlow({ ...defaultWork('t'), openingBalance: 0 }, [])).toEqual({ months: [], peak: null });
  });
});

test('daysUntil', () => {
  expect(daysUntil('2026-10-12', today)).toBe(10);
  expect(daysUntil('2026-09-30', today)).toBe(-2);
  expect(daysUntil('', today)).toBeNull();
});
