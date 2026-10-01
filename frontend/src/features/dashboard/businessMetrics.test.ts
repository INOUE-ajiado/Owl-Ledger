import { describe, expect, test } from 'vitest';
import { buildBusinessMetrics } from './businessMetrics';
import { buildVendorIndex } from '../../utils/names';
import type { Project } from '../../types';

const project = (overrides: Partial<Project>): Project => ({
  id: 'p', projectId: '202610-0001', registrationDate: '2026-10-01', title: 'T', workerName: '', category: '',
  clientId: 'c1', clientName: 'C', status: '進行中', taxType: 'exclusive', characterCount: 1, gloss: 0, marginRate: 30,
  negotiationFeeRate: 1, breakdown: [], projectType: 'standard', ...overrides,
});

const vendors = buildVendorIndex([{ id: 'v1', name: '芳川 弥生', type: 'individual', withholding: true }]);
const period = { from: '2026-04-01', to: '2027-03-31' };
const today = new Date(2026, 9, 1);

describe('経営分析の集計', () => {
  const projects: Project[] = [
    project({ id: 'a', gloss: 600000, copyrightManager: '井上 賢治', breakdown: [
      { name: '芳川弥生', amount: 300000, percentage: 0, quantity: 1 },
      { name: '新山 恵美子', amount: 120000, percentage: 0, quantity: 1 },
    ] }),
    project({ id: 'b', gloss: 100000, status: '完了', copyrightManager: '井上 賢治' }),
    project({ id: 'c', gloss: 200000, status: '請求済', isFixed: true, registrationDate: '2025-01-10',
      fixedInvoiceData: { issueDate: '2026/09/01', dueDate: '2026/10/31', subtotal: 200000, tax: 20000, total: 220000, unitPrice: 200000 } }),
    project({ id: 'm', projectType: 'master', title: 'M', totalBudget: 1000000 }),
    project({ id: 's1', projectType: 'sub', masterProjectId: 'm', allocatedAmount: 300000, status: '請求済' }),
    project({ id: 's2', projectType: 'sub', masterProjectId: 'm', allocatedAmount: 200000, status: '進行中' }),
  ];
  const m = buildBusinessMetrics(projects, period, 10, vendors, today);

  test('版権担当者別 (期間内のみ・未設定はまとめる)', () => {
    const inoue = m.byManager.find(r => r.label === '井上 賢治');
    expect(inoue?.count).toBe(2);
    expect(inoue?.sales).toBe(700000);
    expect(m.byManager.find(r => r.label === '未設定')?.count).toBe(2); // 子プロジェクト2件
  });

  test('作業者別は外注先マスタで名寄せし、売上を配分額の比率で按分する', () => {
    const yoshikawa = m.byWorker.find(r => r.key === 'v1');
    expect(yoshikawa?.payout).toBe(300000);
    expect(yoshikawa?.sales).toBeCloseTo(600000 * 300000 / 420000, 6);
    expect(m.byWorker.find(r => r.label === '新山 恵美子 (未登録)')?.payout).toBe(120000);
  });

  test('見込み・未確定・入金予定', () => {
    expect(m.pipeline).toEqual({ count: 2, sales: 600000 + 200000 });
    expect(m.uninvoiced).toEqual({ count: 1, sales: 100000 });
    expect(m.receivables).toEqual([{ month: '2026-10', total: 220000, count: 1 }]);
    expect(m.overdueTotal).toBe(0);
  });

  test('マスターの予算と実績', () => {
    expect(m.masters[0]).toMatchObject({ budget: 1000000, allocated: 500000, actual: 300000, remaining: 500000, subCount: 2 });
  });
});
