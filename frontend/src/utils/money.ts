import type { Project } from '../types';

export const DEFAULT_TAX_RATE = 10;

// 価格交渉料: GLOSS(税抜) × 料率。最低保証 4,000円・上限 10,000円
export const NEGOTIATION_FEE_MIN = 4000;
export const NEGOTIATION_FEE_MAX = 10000;

export type TaxType = 'inclusive' | 'exclusive';

export interface TaxSplit {
  subtotal: number; // 税抜
  tax: number;
  total: number;    // 税込
}

/** 入力額を税抜・消費税・税込に分ける (端数は丸めない。表示時に丸める) */
export const splitTax = (amount: number, taxType: TaxType, taxRatePercent: number): TaxSplit => {
  const rate = taxRatePercent / 100;
  if (taxType === 'inclusive') {
    const subtotal = amount / (1 + rate);
    return { subtotal, tax: amount - subtotal, total: amount };
  }
  const tax = amount * rate;
  return { subtotal: amount, tax, total: amount + tax };
};

export const toTaxExclusive = (amount: number, taxType: TaxType, taxRatePercent: number) =>
  splitTax(amount, taxType, taxRatePercent).subtotal;

export const calcNegotiationFee = (glossExclusive: number, feeRatePercent: number) =>
  Math.max(NEGOTIATION_FEE_MIN, Math.min(NEGOTIATION_FEE_MAX, glossExclusive * (feeRatePercent / 100)));

export interface ProjectFinancials {
  base: number;           // 通常は GLOSS、子プロジェクトは捻出額
  glossExclusive: number; // 税抜の売上
  margin: number;         // MARGIN (価格交渉料を引く前)
  negotiationFee: number;
  finalMargin: number;    // MARGIN (社内配分計)
  net: number;            // NET (社外配分計)
}

export const projectFinancials = (
  project: Pick<Project, 'projectType' | 'gloss' | 'allocatedAmount' | 'taxType' | 'marginRate' | 'negotiationFeeRate'>,
  taxRatePercent: number,
): ProjectFinancials => {
  const base = project.projectType === 'sub' ? (project.allocatedAmount || 0) : (project.gloss || 0);
  const glossExclusive = toTaxExclusive(base, project.taxType || 'exclusive', taxRatePercent);
  const margin = glossExclusive * ((project.marginRate || 0) / 100);
  const negotiationFee = calcNegotiationFee(glossExclusive, project.negotiationFeeRate || 0);
  return {
    base,
    glossExclusive,
    margin,
    negotiationFee,
    finalMargin: margin - negotiationFee,
    net: glossExclusive - margin,
  };
};

/**
 * 個人への報酬・料金にかかる源泉徴収税額 (所得税法204条・復興特別所得税込み)。
 * 1回の支払が100万円以下は 10.21%、100万円を超える部分は 20.42%。1円未満切り捨て。
 * 消費税を区分して請求される場合は、税抜金額を対象にする。
 */
export const calcWithholdingTax = (amount: number) => {
  if (amount <= 0) return 0;
  if (amount <= 1_000_000) return Math.floor(amount * 0.1021);
  return Math.floor((amount - 1_000_000) * 0.2042 + 102_100);
};

/** 発行日の翌月末日 (請求書のお支払期限) */
export const endOfNextMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 2, 0);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** YYYY/MM/DD */
export const formatYmdSlash = (date: Date) => `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;

/** YYYY-MM-DD (input[type=date] 用・ローカル時刻) */
export const formatYmdDash = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** 'YYYY-MM-DD' / 'YYYY/MM/DD' をローカル時刻の Date にする */
export const parseYmd = (value: string): Date | null => {
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(value || '');
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(date.getTime()) ? null : date;
};

export const formatYen = (amount: number) => new Intl.NumberFormat('ja-JP').format(Math.round(amount));
