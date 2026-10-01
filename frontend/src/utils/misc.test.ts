import { describe, expect, test } from 'vitest';
import { buildVendorIndex, normalizeName } from './names';
import { diffObjects } from './diff';
import { counterKey, formatDocNumber } from './numbering';
import { fiscalYearOf, inPeriod, monthsInPeriod, presetPeriod } from './period';
import { retentionDeadline } from '../features/ledger/search/retention';
import type { Vendor } from '../types';

describe('名寄せ', () => {
  test('空白・全角半角・先頭の丸数字の違いを無視する', () => {
    const key = normalizeName('新山 恵美子');
    expect(normalizeName('新山恵美子')).toBe(key);
    expect(normalizeName('①新山 恵美子')).toBe(key);
    expect(normalizeName('新山　恵美子')).toBe(key);
    expect(normalizeName('ＡＢＣ')).toBe(normalizeName('abc'));
  });

  test('vendorId → 名前 → 別表記の順で外注先を引く', () => {
    const vendors: Vendor[] = [
      { id: 'v1', name: '芳川 弥生', type: 'individual', withholding: true },
      { id: 'v2', name: 'アトリエローク', type: 'corporate', withholding: false, aliases: ['アトリエローク07'] },
    ];
    const index = buildVendorIndex(vendors);
    expect(index.resolve('だれか', 'v1')?.id).toBe('v1');
    expect(index.resolve('芳川弥生')?.id).toBe('v1');
    expect(index.resolve('アトリエローク07')?.id).toBe('v2');
    expect(index.resolve('未登録の人')).toBeUndefined();
  });
});

describe('変更履歴の差分', () => {
  test('変わった項目だけを返す', () => {
    expect(diffObjects({ a: 1, b: 'x' }, { a: 2, b: 'x' })).toEqual([{ field: 'a', before: '1', after: '2' }]);
  });
  test('内訳の配列は行ごと・項目ごとに比べる', () => {
    const before = { breakdown: [{ name: 'A', amount: 100 }] };
    const after = { breakdown: [{ name: 'A', amount: 150 }, { name: 'B', amount: 50 }] };
    expect(diffObjects(before, after)).toEqual([
      { field: 'breakdown.0.amount', before: '100', after: '150' },
      { field: 'breakdown.1.amount', before: '', after: '50' },
      { field: 'breakdown.1.name', before: '', after: 'B' },
    ]);
  });
  test('作成・削除と除外項目', () => {
    expect(diffObjects(null, { title: 'T', id: 'x' }, ['id'])).toEqual([{ field: 'title', before: '', after: 'T' }]);
    expect(diffObjects({ title: 'T' }, null)).toEqual([{ field: 'title', before: 'T', after: '' }]);
  });
});

describe('帳票番号', () => {
  test('種類 + 年月 + 4桁の連番', () => {
    const date = new Date(2026, 9, 1);
    expect(counterKey('I', date)).toBe('I202610');
    expect(formatDocNumber('I', date, 3)).toBe('I202610-0003');
    expect(formatDocNumber('Q', date, 12)).toBe('Q202610-0012');
  });
});

describe('期間', () => {
  test('年度は4月始まり', () => {
    expect(fiscalYearOf('2026-03-31')).toBe(2025);
    expect(fiscalYearOf('2026-04-01')).toBe(2026);
    expect(fiscalYearOf('')).toBeNull();
  });
  test('プリセット', () => {
    const today = new Date(2026, 9, 1); // 2026-10-01
    expect(presetPeriod('thisMonth', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(presetPeriod('lastMonth', new Date(2026, 0, 10))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(presetPeriod('thisFiscalYear', today)).toEqual({ from: '2026-04-01', to: '2027-03-31' });
    expect(presetPeriod('thisFiscalYear', new Date(2026, 1, 1))).toEqual({ from: '2025-04-01', to: '2026-03-31' });
    expect(presetPeriod('all', today)).toEqual({ from: '', to: '' });
  });
  test('期間内の判定と月の一覧', () => {
    const period = { from: '2026-04-01', to: '2026-06-30' };
    expect(inPeriod('2026-04-01', period)).toBe(true);
    expect(inPeriod('2026/06/30', period)).toBe(true);
    expect(inPeriod('2026-07-01', period)).toBe(false);
    expect(monthsInPeriod(period)).toEqual(['2026-04', '2026-05', '2026-06']);
    expect(monthsInPeriod({ from: '', to: '' }, ['2025-11-03', '2026-01-20'])).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});

describe('電子帳簿の保存期限 (目安)', () => {
  test('事業年度の申告期限 (翌年5月末) から7年', () => {
    expect(retentionDeadline('2026-10-01')).toBe('2034-05-31');
    expect(retentionDeadline('2026-03-15')).toBe('2033-05-31');
  });
});
