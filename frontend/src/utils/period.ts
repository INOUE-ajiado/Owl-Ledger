/** 年度 (4月始まり)。'YYYY-MM-DD' → 2026 など */
export const fiscalYearOf = (ymd: string): number | null => {
  const m = /^(\d{4})-(\d{2})/.exec(ymd || '');
  if (!m) return null;
  const year = Number(m[1]);
  return Number(m[2]) <= 3 ? year - 1 : year;
};

export interface Period {
  from: string; // 'YYYY-MM-DD' (空なら制限なし)
  to: string;
}

export const inPeriod = (ymd: string | undefined, period: Period) => {
  if (!ymd) return false;
  const day = ymd.slice(0, 10).replace(/\//g, '-');
  return (!period.from || day >= period.from) && (!period.to || day <= period.to);
};

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate(); // m: 1-12

export type PeriodPreset = 'thisMonth' | 'lastMonth' | 'thisFiscalYear' | 'lastFiscalYear' | 'thisYear' | 'lastYear' | 'all';

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'thisMonth', label: '今月' },
  { id: 'lastMonth', label: '先月' },
  { id: 'thisFiscalYear', label: '今年度' },
  { id: 'lastFiscalYear', label: '前年度' },
  { id: 'thisYear', label: '今年' },
  { id: 'lastYear', label: '昨年' },
  { id: 'all', label: '全期間' },
];

export const presetPeriod = (preset: PeriodPreset, today: Date = new Date()): Period => {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const fy = m <= 3 ? y - 1 : y;
  switch (preset) {
    case 'thisMonth': return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m))}` };
    case 'lastMonth': {
      const ly = m === 1 ? y - 1 : y;
      const lm = m === 1 ? 12 : m - 1;
      return { from: `${ly}-${pad(lm)}-01`, to: `${ly}-${pad(lm)}-${pad(lastDay(ly, lm))}` };
    }
    case 'thisFiscalYear': return { from: `${fy}-04-01`, to: `${fy + 1}-03-31` };
    case 'lastFiscalYear': return { from: `${fy - 1}-04-01`, to: `${fy}-03-31` };
    case 'thisYear': return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'lastYear': return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'all': return { from: '', to: '' };
  }
};

/** 期間内の月 ('YYYY-MM') の一覧。全期間のときはデータの範囲から作る */
export const monthsInPeriod = (period: Period, fallbackDates: string[] = []): string[] => {
  const sorted = fallbackDates.filter(Boolean).map(d => d.slice(0, 7)).sort();
  const start = period.from ? period.from.slice(0, 7) : sorted[0];
  const end = period.to ? period.to.slice(0, 7) : sorted[sorted.length - 1];
  if (!start || !end || start > end) return [];
  const months: string[] = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    if (months.length > 240) break;
  }
  return months;
};
