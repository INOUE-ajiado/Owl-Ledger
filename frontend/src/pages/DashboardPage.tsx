import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppOutletContext } from '../contexts';
import ProjectAnalysis from '../features/dashboard/ProjectAnalysis';
import BusinessAnalysis from '../features/dashboard/BusinessAnalysis';
import LedgerAnalysis from '../features/dashboard/LedgerAnalysis';
import CopyrightAnalysis from '../features/dashboard/CopyrightAnalysis';
import PeriodSelector from '../features/dashboard/PeriodSelector';
import { presetPeriod, PERIOD_PRESETS, type Period, type PeriodPreset } from '../utils/period';

type DashboardView = 'sales' | 'business' | 'copyright' | 'expenses';

const VIEWS: { id: DashboardView; label: string }[] = [
  { id: 'sales', label: '売上分析' },
  { id: 'business', label: '経営分析' },
  { id: 'copyright', label: '版権分析' },
  { id: 'expenses', label: '経費分析' },
];

const DashboardPage = () => {
  const { setHeaderProps } = useAppOutletContext();
  // 表示中のタブと期間は URL に保持し、再読み込みや共有でも同じ表示にする
  const [searchParams, setSearchParams] = useSearchParams();
  const view = (VIEWS.some(v => v.id === searchParams.get('view')) ? searchParams.get('view') : 'sales') as DashboardView;
  const presetParam = searchParams.get('preset');
  const preset: PeriodPreset | 'custom' = presetParam === 'custom' || PERIOD_PRESETS.some(p => p.id === presetParam)
    ? presetParam as PeriodPreset | 'custom' : 'thisFiscalYear';
  const period: Period = useMemo(() => preset === 'custom'
    ? { from: searchParams.get('from') ?? '', to: searchParams.get('to') ?? '' }
    : presetPeriod(preset), [preset, searchParams]);

  const update = (changes: Record<string, string>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    setHeaderProps({
      title: 'ダッシュボード',
      actions: (
        <div className="flex flex-wrap gap-1 p-1 border rounded-lg bg-white/20 backdrop-blur-sm border-white/20">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => update({ view: v.id })}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-all duration-200 ${view === v.id ? 'bg-earth-500 text-white shadow-md' : 'text-earth-700 hover:bg-white/30'}`}>
              {v.label}
            </button>
          ))}
        </div>
      ),
    });
    // update は searchParams にのみ依存する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderProps, view]);

  return (
    <div className="w-full min-h-full">
      <PeriodSelector
        period={period}
        preset={preset}
        onChange={(next, nextPreset) => update(nextPreset === 'custom'
          ? { preset: 'custom', from: next.from, to: next.to }
          : { preset: nextPreset, from: '', to: '' })}
      />
      {view === 'sales' && <ProjectAnalysis period={period} />}
      {view === 'business' && <BusinessAnalysis period={period} />}
      {view === 'copyright' && <CopyrightAnalysis period={period} />}
      {view === 'expenses' && <LedgerAnalysis period={period} />}
    </div>
  );
};

export default DashboardPage;
