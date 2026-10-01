import type { Project } from '../../../types';
import { toTaxExclusive } from '../../../utils/money';
import { fiscalYearOf } from '../../../utils/period';

export interface ProjectStatRow {
  id: string;
  workerName: string;
  title: string;
  fiscalYear: string;
  registrationDate: string;
  gloss: number;
  marginRate: number;
  margin: number;
  net: number;
  glossUnitPrice: number;
  netUnitPrice: number;
  characterCount: number;
  category: string;
}

export interface YearlyStat {
  year: string;
  avgGloss: number;
  avgMarginRate: string | number;
  avgNet: number;
  avgCharacterCount: string | number;
  avgGlossUnitPrice: number;
  avgNetUnitPrice: number;
  count: number;
}

export interface SummaryStats {
  totalGloss: number;
  totalCount: number;
  supervisedCount: number;
  normalCount: number;
  topCreators: { name: string; count: number }[];
  topSupervisedCreators: { name: string; count: number }[];
}

/** プロジェクト一覧の「分析」に出す、プロジェクト別・年度別の数値 */
export const buildProjectStats = (projects: Project[], taxRate: number) => {
  type Stats = { count: number; totalGloss: number; totalMarginRate: number; totalNet: number; totalCharacterCount: number; };
  const grouped: Record<string, Stats> = {};
  const creatorStats: Record<string, { total: number; supervised: number; }> = {};

  const projectStatsList: ProjectStatRow[] = projects.filter(p => p.projectType !== 'sub').map(p => {
    const fy = fiscalYearOf(p.registrationDate);
    const fYearStr = fy === null ? '不明' : `${fy}年度`;
    const isSupervised = p.category?.includes('【監修】');
    const groupKey = `${fYearStr} ${isSupervised ? '【監修】版権' : '通常版権'}`;
    grouped[groupKey] ??= { count: 0, totalGloss: 0, totalMarginRate: 0, totalNet: 0, totalCharacterCount: 0 };

    const glossInput = p.gloss || 0;
    const glossTaxExclusive = toTaxExclusive(glossInput, p.taxType || 'exclusive', taxRate);
    const marginRate = p.marginRate || 0;
    const margin = glossTaxExclusive * (marginRate / 100);
    const net = glossTaxExclusive - margin;
    const charCount = p.characterCount || 0;

    grouped[groupKey].count += 1;
    grouped[groupKey].totalGloss += glossInput;
    grouped[groupKey].totalMarginRate += marginRate;
    grouped[groupKey].totalNet += net;
    grouped[groupKey].totalCharacterCount += charCount;

    const workerName = p.workerName || '未指定';
    creatorStats[workerName] ??= { total: 0, supervised: 0 };
    creatorStats[workerName].total += 1;
    if (isSupervised) creatorStats[workerName].supervised += 1;

    return {
      id: p.id,
      workerName: p.workerName,
      title: p.title,
      fiscalYear: fYearStr,
      registrationDate: p.registrationDate,
      gloss: Math.round(glossInput),
      marginRate,
      margin: Math.round(margin),
      net: Math.round(net),
      glossUnitPrice: charCount > 0 ? Math.round(glossInput / charCount) : 0,
      netUnitPrice: charCount > 0 ? Math.round(Math.round(net) / charCount) : 0,
      characterCount: charCount,
      category: p.category,
    };
  });

  const yearlyStats: YearlyStat[] = Object.entries(grouped).map(([year, stats]) => {
    const count = stats.count;
    return {
      year,
      avgGloss: count > 0 ? Math.round(stats.totalGloss / count) : 0,
      avgMarginRate: count > 0 ? (stats.totalMarginRate / count).toFixed(1) : 0,
      avgNet: count > 0 ? Math.round(stats.totalNet / count) : 0,
      avgCharacterCount: count > 0 ? (stats.totalCharacterCount / count).toFixed(1) : 0,
      avgGlossUnitPrice: stats.totalCharacterCount > 0 ? Math.round(stats.totalGloss / stats.totalCharacterCount) : 0,
      avgNetUnitPrice: stats.totalCharacterCount > 0 ? Math.round(stats.totalNet / stats.totalCharacterCount) : 0,
      count,
    };
  }).sort((a, b) => b.year.localeCompare(a.year));

  const totalGloss = projectStatsList.reduce((sum, p) => sum + p.gloss, 0);
  const supervisedCount = projectStatsList.filter(p => p.category?.includes('【監修】')).length;
  const summaryStats: SummaryStats = {
    totalGloss,
    totalCount: projectStatsList.length,
    supervisedCount,
    normalCount: projectStatsList.length - supervisedCount,
    topCreators: Object.entries(creatorStats).sort((a, b) => b[1].total - a[1].total).slice(0, 3).map(([name, s]) => ({ name, count: s.total })),
    topSupervisedCreators: Object.entries(creatorStats).filter(e => e[1].supervised > 0)
      .sort((a, b) => b[1].supervised - a[1].supervised).slice(0, 3).map(([name, s]) => ({ name, count: s.supervised })),
  };

  return { yearlyStats, projectStatsList, summaryStats };
};
