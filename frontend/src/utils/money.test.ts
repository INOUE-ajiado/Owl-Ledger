import { describe, expect, test } from 'vitest';
import { calcNegotiationFee, calcWithholdingTax, endOfNextMonth, formatYmdSlash, parseYmd, projectFinancials, splitTax, toTaxExclusive } from './money';
import { calcPurchaseOrderPayment } from '../features/projects/purchase-order/hooks/usePurchaseOrderIssue';
import type { Project } from '../types';

const base = { projectType: 'standard', gloss: 0, allocatedAmount: 0, taxType: 'exclusive', marginRate: 30, negotiationFeeRate: 1 } as Pick<Project, 'projectType' | 'gloss' | 'allocatedAmount' | 'taxType' | 'marginRate' | 'negotiationFeeRate'>;

describe('消費税の計算', () => {
  test('税抜の金額に 10% を足す', () => {
    expect(splitTax(100000, 'exclusive', 10)).toEqual({ subtotal: 100000, tax: 10000, total: 110000 });
  });

  test('税込の金額から税抜と消費税に分ける', () => {
    const { subtotal, tax, total } = splitTax(110000, 'inclusive', 10);
    expect(total).toBe(110000);
    expect(subtotal).toBeCloseTo(100000, 6);
    expect(tax).toBeCloseTo(10000, 6);
  });

  test('税率を変えられる (8%)', () => {
    expect(splitTax(10000, 'exclusive', 8).total).toBe(10800);
    expect(toTaxExclusive(10800, 'inclusive', 8)).toBeCloseTo(10000, 6);
  });

  test('税率 0% なら税額は 0', () => {
    expect(splitTax(5000, 'inclusive', 0)).toEqual({ subtotal: 5000, tax: 0, total: 5000 });
  });
});

describe('価格交渉料', () => {
  test('最低保証 4,000円', () => {
    expect(calcNegotiationFee(100000, 1)).toBe(4000);
  });
  test('上限 10,000円', () => {
    expect(calcNegotiationFee(5_000_000, 1)).toBe(10000);
  });
  test('範囲内は GLOSS × 料率', () => {
    expect(calcNegotiationFee(600000, 1)).toBe(6000);
  });
});

describe('プロジェクトの MARGIN・NET', () => {
  test('通常 (税抜): MARGIN = GLOSS × 料率、社内配分 = MARGIN − 価格交渉料', () => {
    const fin = projectFinancials({ ...base, gloss: 600000 }, 10);
    expect(fin.glossExclusive).toBe(600000);
    expect(fin.margin).toBe(180000);
    expect(fin.net).toBe(420000);
    expect(fin.negotiationFee).toBe(6000);
    expect(fin.finalMargin).toBe(174000);
  });

  test('通常 (税込): 税抜に直してから計算する', () => {
    const fin = projectFinancials({ ...base, gloss: 660000, taxType: 'inclusive' }, 10);
    expect(fin.glossExclusive).toBeCloseTo(600000, 6);
    expect(fin.net).toBeCloseTo(420000, 6);
  });

  test('子プロジェクトは捻出額をもとに計算する', () => {
    const fin = projectFinancials({ ...base, projectType: 'sub', gloss: 999999, allocatedAmount: 200000, marginRate: 20 }, 10);
    expect(fin.base).toBe(200000);
    expect(fin.margin).toBe(40000);
    expect(fin.net).toBe(160000);
  });
});

describe('源泉徴収税額', () => {
  test('100万円以下は 10.21% (1円未満切り捨て)', () => {
    expect(calcWithholdingTax(100000)).toBe(10210);
    expect(calcWithholdingTax(33333)).toBe(3403); // 3403.29...
    expect(calcWithholdingTax(1_000_000)).toBe(102100);
  });
  test('100万円を超える部分は 20.42%', () => {
    expect(calcWithholdingTax(1_500_000)).toBe(204200); // 500,000 × 20.42% + 102,100
  });
  test('0円以下は 0', () => {
    expect(calcWithholdingTax(0)).toBe(0);
    expect(calcWithholdingTax(-100)).toBe(0);
  });
});

describe('発注書の支払額', () => {
  test('個人・源泉対象: 税抜 + 消費税 − 源泉徴収', () => {
    expect(calcPurchaseOrderPayment(100000, 10, { type: 'individual', withholding: true }))
      .toEqual({ tax: 10000, withholdingTax: 10210, paymentAmount: 99790 });
  });
  test('法人は源泉徴収しない', () => {
    expect(calcPurchaseOrderPayment(100000, 10, { type: 'corporate', withholding: true }))
      .toEqual({ tax: 10000, withholdingTax: 0, paymentAmount: 110000 });
  });
  test('外注先マスタ未登録なら源泉徴収しない', () => {
    expect(calcPurchaseOrderPayment(12345, 10).withholdingTax).toBe(0);
  });
});

describe('日付', () => {
  test('請求書のお支払期限は翌月末', () => {
    expect(formatYmdSlash(endOfNextMonth(new Date(2026, 0, 31)))).toBe('2026/02/28');
    expect(formatYmdSlash(endOfNextMonth(new Date(2026, 11, 15)))).toBe('2027/01/31');
    expect(formatYmdSlash(endOfNextMonth(new Date(2028, 0, 1)))).toBe('2028/02/29');
  });
  test('YYYY-MM-DD / YYYY/MM/DD を読み取る', () => {
    expect(parseYmd('2026-10-01')?.getDate()).toBe(1);
    expect(parseYmd('2026/10/01')?.getMonth()).toBe(9);
    expect(parseYmd('')).toBeNull();
  });
});
