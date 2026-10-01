import { PERIOD_PRESETS, presetPeriod, type Period, type PeriodPreset } from '../../utils/period';

interface PeriodSelectorProps {
  period: Period;
  preset: PeriodPreset | 'custom';
  onChange: (period: Period, preset: PeriodPreset | 'custom') => void;
}

/** ダッシュボード共通の期間指定 (プリセットまたは日付範囲) */
const PeriodSelector = ({ period, preset, onChange }: PeriodSelectorProps) => (
  <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm border-b md:px-4 bg-white/50 border-white/30">
    <span className="text-xs font-semibold text-earth-600">期間</span>
    <div className="flex flex-wrap gap-1">
      {PERIOD_PRESETS.map(p => (
        <button key={p.id} type="button" onClick={() => onChange(presetPeriod(p.id), p.id)}
          className={`px-2.5 py-1 text-xs rounded-full border ${preset === p.id ? 'bg-earth-600 text-white border-earth-600' : 'bg-white/60 text-earth-700 border-earth-200 hover:bg-white'}`}>
          {p.label}
        </button>
      ))}
    </div>
    <div className="flex items-center gap-1">
      <input type="date" value={period.from} onChange={e => onChange({ ...period, from: e.target.value }, 'custom')} className="py-1 text-xs border-gray-300 rounded-md" aria-label="開始日" />
      <span className="text-earth-500">〜</span>
      <input type="date" value={period.to} onChange={e => onChange({ ...period, to: e.target.value }, 'custom')} className="py-1 text-xs border-gray-300 rounded-md" aria-label="終了日" />
    </div>
  </div>
);

export default PeriodSelector;
