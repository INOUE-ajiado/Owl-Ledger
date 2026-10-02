import type { BudgetLine, BudgetSection, BudgetSheet, Work } from '../../types';

const newLineId = () => Math.random().toString(36).slice(2, 10);

export const emptyLine = (name = ''): BudgetLine => ({ id: newLineId(), name, calc: '', amount: 0 });

// アニメ制作の標準的な予算表の項目。旧形式の工程 ID (prepro / animation / photography / sound / production) は
// 対応するセクションの ID にして、既存の原価・出納帳の紐付けをそのまま集計できるようにする
const TEMPLATE: { id: string; name: string; lines: string[] }[] = [
  { id: 'prepro', name: '企画・文芸', lines: ['シリーズ構成', '脚本', '原作使用料'] },
  { id: 'direction', name: '演出', lines: ['監督', '絵コンテ', '演出'] },
  { id: 'design', name: '設定', lines: ['メインキャラ (総作監代含む)', 'サブキャラ', 'プロップデザイン', '色彩設計'] },
  { id: 'animation', name: '作画', lines: ['総作画監督', '作画監督', 'レイアウト', '原画', 'アニメーター拘束費'] },
  { id: 'inbetween', name: '動画', lines: ['動画', '動画チェック'] },
  { id: 'paint', name: '仕上', lines: ['仕上', '色指定・検査'] },
  { id: 'art', name: '美術', lines: ['美術監督', '美術設定', '背景', '3Dレイアウト'] },
  { id: 'photography', name: '撮影', lines: ['撮影監督', '撮影', 'デジタルワークス', '特殊効果', '線撮'] },
  { id: 'cg', name: '3DCG', lines: ['モデリング', '3DCG'] },
  { id: 'oped', name: 'OP・ED費', lines: ['OP・ED費'] },
  { id: 'sound', name: '音響', lines: ['音響監督', 'キャスト', '効果', 'ミキサー', 'スタジオ', 'AR台本'] },
  { id: 'editing', name: '編集', lines: ['オフライン編集'] },
  { id: 'video', name: 'ビデオ編集', lines: ['オンライン編集', 'テープ代'] },
  { id: 'materials', name: '材料', lines: ['コンテ用紙', 'カット袋', 'タイムシート', 'レイアウト用紙', '作画用紙', '修正用紙', 'テープ', 'その他'] },
  { id: 'production', name: '制作', lines: ['プロデューサー', '企画P', 'デスク', '制作進行', '設定制作', '予備費 (ロケハン含む)'] },
];

export const defaultBudgetSheet = (): BudgetSheet => ({
  title: '予算表案',
  createdDate: '',
  basis: 'episode',
  sections: TEMPLATE.map(t => ({ id: t.id, name: t.name, lines: t.lines.map(name => emptyLine(name)) })),
  managementRate: 10,
  grossManagementFee: 0,
  targetTotal: 0,
  investmentRate: 5,
});

// 旧形式 (工程別の予算額だけ) の作品を、シリーズ全体の予算表に移す
const LEGACY_SECTION: Record<string, string> = { prepro: 'prepro', animation: 'animation', photography: 'photography', sound: 'sound', production: 'production' };

export const budgetSheetFor = (data: Pick<Partial<Work>, 'budgetSheet' | 'categoryBudgets'>): BudgetSheet => {
  if (data.budgetSheet) return { ...defaultBudgetSheet(), ...data.budgetSheet };
  const sheet = defaultBudgetSheet();
  const legacy = Object.entries(data.categoryBudgets ?? {}).filter(([, amount]) => amount > 0);
  if (legacy.length === 0) return sheet;
  sheet.basis = 'series';
  legacy.forEach(([key, amount]) => {
    const section = sheet.sections.find(s => s.id === LEGACY_SECTION[key]);
    if (section) section.lines.unshift({ ...emptyLine('予算 (旧設定)'), amount });
  });
  return sheet;
};

/**
 * 積算メモを数式として読む。単位の文字は無視し、「万」は 10,000 倍、×・÷ と * / + - を使える。
 * 例: 60万×16か月÷12話 → 800,000 / 3000×280CUT → 840,000 / 3600枚×250円 → 900,000
 * 数値が1つだけ、または読めない場合は null。
 */
export const evaluateCalc = (calc: string): number | null => {
  const text = (calc || '')
    .normalize('NFKC')
    .replace(/,/g, '')
    .replace(/[×xX＊]/g, '*')
    .replace(/[÷／]/g, '/');
  const tokens = text.match(/\d+(?:\.\d+)?万?|[*/+-]/g);
  if (!tokens || tokens.filter(t => /\d/.test(t)).length < 2) return null;

  const values: number[] = [];
  const ops: string[] = [];
  let expectNumber = true;
  for (const token of tokens) {
    if (/\d/.test(token)) {
      if (!expectNumber) ops.push('*'); // 「3000円 280CUT」のように演算子がなければ掛け算とみなす
      values.push(token.endsWith('万') ? parseFloat(token) * 10_000 : parseFloat(token));
      expectNumber = false;
    } else {
      if (expectNumber) return null;
      ops.push(token);
      expectNumber = true;
    }
  }
  if (expectNumber) return null;

  // 掛け算・割り算を先に計算する
  const terms: number[] = [values[0]];
  const addOps: string[] = [];
  for (let i = 0; i < ops.length; i++) {
    const value = values[i + 1];
    if (ops[i] === '*') terms[terms.length - 1] *= value;
    else if (ops[i] === '/') {
      if (value === 0) return null;
      terms[terms.length - 1] /= value;
    } else {
      addOps.push(ops[i]);
      terms.push(value);
    }
  }
  const result = terms.slice(1).reduce((sum, t, i) => (addOps[i] === '+' ? sum + t : sum - t), terms[0]);
  return Number.isFinite(result) ? Math.round(result) : null;
};

export const sectionSubtotal = (section: BudgetSection) => section.lines.reduce((s, l) => s + (l.amount || 0), 0);

export interface BudgetSummary {
  direct: number;          // 直接費合計
  management: number;      // 管理費 A (直接費合計 × 管理費率)
  investment: number;      // 出資額 (総合計額 × 出資率)
  grandTotal: number;      // 総合計 (出資額を除く)
  target: number;          // 出資額を含む総合計額
  profit: number;          // 粗利 C (総合計 - 直接費 - 管理費)
  grossProfit: number;     // グロス使用時の粗利 (A - B + C)
  profitRate: number | null;            // 粗利 ÷ 出資額を含む総合計額
  managementProfit: number;             // 管理費 + 粗利
  managementProfitRate: number | null;  // (管理費 + 粗利) ÷ 総合計
}

/**
 * 予算表の集計。出資額を含む総合計額 (目標額) が決まっていれば、そこから出資額を引いた総合計と
 * 直接費・管理費の差額を粗利とする。目標額が未設定なら、直接費 + 管理費を総合計とする (粗利 0)。
 */
export const budgetSummary = (sheet: BudgetSheet): BudgetSummary => {
  const direct = sheet.sections.reduce((s, sec) => s + sectionSubtotal(sec), 0);
  const management = Math.round(direct * (sheet.managementRate || 0) / 100);
  const hasTarget = (sheet.targetTotal || 0) > 0;
  const investment = hasTarget ? Math.round(sheet.targetTotal * (sheet.investmentRate || 0) / 100) : 0;
  const grandTotal = hasTarget ? sheet.targetTotal - investment : direct + management;
  const profit = hasTarget ? grandTotal - direct - management : 0;
  const target = hasTarget ? sheet.targetTotal : grandTotal;
  return {
    direct, management, investment, grandTotal, target, profit,
    grossProfit: management - (sheet.grossManagementFee || 0) + profit,
    profitRate: target > 0 ? profit / target : null,
    managementProfit: management + profit,
    managementProfitRate: grandTotal > 0 ? (management + profit) / grandTotal : null,
  };
};

/** 予算表の金額をシリーズ全体に換算する倍率 (1話あたりなら話数) */
export const seriesMultiplier = (work: Pick<Work, 'budgetSheet' | 'episodes'>) =>
  work.budgetSheet.basis === 'episode' ? Math.max(1, work.episodes.length) : 1;

/** 予実・原価入力で選べる工程 (予算表のセクション) */
export const costSections = (work: Pick<Work, 'budgetSheet'>) => work.budgetSheet.sections.map(s => ({ id: s.id, label: s.name }));

/**
 * 印刷で左右2段に分ける。行数がなるべく均等になる位置で切る (セクションの途中では切らない)。
 * extraRight は右段の下に置く集計欄の行数。
 */
export const splitColumns = (sections: BudgetSection[], extraRight = 0) => {
  const weight = (s: BudgetSection) => s.lines.length + 2; // 見出し + 小計
  const total = sections.reduce((s, x) => s + weight(x), 0);
  let best = sections.length;
  let bestDiff = Infinity;
  let acc = 0;
  for (let i = 0; i <= sections.length; i++) {
    const diff = Math.abs(2 * acc - total - extraRight);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
    if (i < sections.length) acc += weight(sections[i]);
  }
  return [sections.slice(0, best), sections.slice(best)];
};
