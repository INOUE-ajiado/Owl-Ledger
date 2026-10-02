import { describe, expect, test } from 'vitest';
import { budgetSheetFor, budgetSummary, defaultBudgetSheet, evaluateCalc, splitColumns } from './budgetSheet';

describe('evaluateCalc (積算メモ)', () => {
  test.each([
    ['60万×16か月÷12話', 800_000],
    ['3000×280CUT', 840_000],
    ['35万 × 4 人', 1_400_000],
    ['3600枚×250円', 900_000],
    ['70万×15か月÷12話', 875_000],
    ['2000円×40カット', 80_000],
    ['1800秒×150', 270_000],
    ['１０万＋５万', 150_000],
    ['3000円 280CUT', 840_000],
  ])('%s → %d', (calc, expected) => {
    expect(evaluateCalc(calc)).toBe(expected);
  });

  test.each(['', '50万', 'メモのみ', '10万÷0', '×3'])('読めないもの (%s) は null', (calc) => {
    expect(evaluateCalc(calc)).toBeNull();
  });
});

describe('budgetSummary', () => {
  test('星旅少年の予算表と同じ集計になる (目標額3000万・管理費10%・出資額5%)', () => {
    const sheet = { ...defaultBudgetSheet(), targetTotal: 30_000_000, sections: [
      { id: 'x', name: '直接費', lines: [{ id: 'l', name: '計', calc: '', amount: 18_978_000 }] },
    ] };
    expect(budgetSummary(sheet)).toMatchObject({
      direct: 18_978_000, management: 1_897_800, investment: 1_500_000, grandTotal: 28_500_000,
      profit: 7_624_200, grossProfit: 9_522_000, managementProfit: 9_522_000,
    });
    expect(budgetSummary(sheet).profitRate).toBeCloseTo(0.254, 3);
  });

  test('目標額が未設定なら直接費 + 管理費を総合計とする', () => {
    const sheet = { ...defaultBudgetSheet(), sections: [{ id: 'x', name: 'x', lines: [{ id: 'l', name: '', calc: '', amount: 1000 }] }] };
    expect(budgetSummary(sheet)).toMatchObject({ grandTotal: 1100, profit: 0, investment: 0, target: 1100 });
  });
});

test('旧形式の工程別予算は、シリーズ全体の予算表の対応セクションに移す', () => {
  const sheet = budgetSheetFor({ categoryBudgets: { animation: 5000, sound: 0 } });
  expect(sheet.basis).toBe('series');
  expect(sheet.sections.find(s => s.id === 'animation')?.lines[0]).toMatchObject({ name: '予算 (旧設定)', amount: 5000 });
  expect(budgetSheetFor({}).basis).toBe('episode');
});

test('splitColumns は行数が均等になる位置で2段に分ける', () => {
  const [left, right] = splitColumns(defaultBudgetSheet().sections);
  const rows = (xs: typeof left) => xs.reduce((s, x) => s + x.lines.length + 2, 0);
  expect(left.length + right.length).toBe(15);
  expect(Math.abs(rows(left) - rows(right))).toBeLessThanOrEqual(8);
});
