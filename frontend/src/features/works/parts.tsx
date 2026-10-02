import type { ReactNode } from 'react';
import { btnPrimary, btnSecondary, inputClass, yen } from './ui';

/** 数値入力 (空欄は 0) */
export const NumberInput = ({ value, onChange, className = '' }: { value: number; onChange: (value: number) => void; className?: string }) => (
  <input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value) || 0)} className={`${inputClass} text-right tabular-nums ${className}`} />
);

const TONES = {
  gray: 'bg-gray-100 text-gray-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-sky-100 text-sky-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-700',
  earth: 'bg-earth-100 text-earth-800',
};
export type Tone = keyof typeof TONES;

export const Badge = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full whitespace-nowrap ${TONES[tone]}`}>{children}</span>
);

/** 積み上げ型のプログレスバー (例: 入金済 / 請求済 / 下書き / 未請求) */
export const StackedBar = ({ total, segments }: { total: number; segments: { value: number; className: string; label: string }[] }) => {
  const base = Math.max(total, segments.reduce((s, x) => s + x.value, 0), 1);
  return (
    <div>
      <div className="flex w-full h-3 overflow-hidden rounded-full bg-earth-100" role="img"
        aria-label={segments.map(s => `${s.label} ${yen(s.value)}`).join('、')}>
        {segments.map(s => s.value > 0 && <div key={s.label} className={s.className} style={{ width: `${(s.value / base) * 100}%` }} />)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-earth-600">
        {segments.map(s => (
          <span key={s.label} className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${s.className}`} />{s.label} <span className="tabular-nums text-earth-900">{yen(s.value)}</span></span>
        ))}
      </div>
    </div>
  );
};

/** 予算消化バー。90%以上は注意、超過は赤 */
export const BudgetBar = ({ budget, actual, status }: { budget: number; actual: number; status: 'ok' | 'warn' | 'over' }) => {
  const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : actual > 0 ? 100 : 0;
  const color = status === 'over' ? 'bg-red-500' : status === 'warn' ? 'bg-amber-400' : 'bg-[#8B9A8B]';
  return (
    <div className="w-full h-2 overflow-hidden rounded-full bg-earth-100">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const EmptyRow = ({ colSpan, children }: { colSpan: number; children: ReactNode }) => (
  <tr><td colSpan={colSpan} className="px-4 py-6 text-sm text-center text-earth-500">{children}</td></tr>
);

export const EditActions = ({ editor, canWrite }: { editor: { editing: boolean; start: () => void; cancel: () => void; save: () => void; saving: boolean }; canWrite: boolean }) => {
  if (!canWrite) return null;
  return editor.editing ? (
    <div className="flex gap-2">
      <button type="button" onClick={editor.cancel} className={btnSecondary}>キャンセル</button>
      <button type="button" onClick={editor.save} disabled={editor.saving} className={btnPrimary}>{editor.saving ? '保存中...' : '保存'}</button>
    </div>
  ) : (
    <button type="button" onClick={editor.start} className={btnSecondary}>編集</button>
  );
};

