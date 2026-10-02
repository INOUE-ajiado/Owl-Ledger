import { ArrowDown, ArrowUp, FileDown, Plus, X } from 'lucide-react';
import { Panel } from '../../components/DetailParts';
import { formatYmdDash } from '../../utils/money';
import type { BudgetLine, BudgetSection, BudgetSheet } from '../../types';
import { budgetSummary, emptyLine, evaluateCalc, sectionSubtotal, seriesMultiplier } from './budgetSheet';
import { newId } from './workMetrics';
import { EditActions, NumberInput } from './parts';
import { btnSecondary, inputClass, removeAt, replaceAt, useEditable, yen } from './ui';
import type { TabProps } from './OverviewTab';

const pct = (rate: number | null) => (rate === null ? '—' : `${(rate * 100).toFixed(1)}%`);

const LineRow = ({ line, editing, onChange, onRemove }: { line: BudgetLine; editing: boolean; onChange: (patch: Partial<BudgetLine>) => void; onRemove: () => void }) => {
  const computed = evaluateCalc(line.calc);
  if (!editing) {
    return (
      <tr className="tabular-nums">
        <td className="px-3 py-1.5 text-earth-900">{line.name}</td>
        <td className="px-3 py-1.5 text-xs text-earth-500">{line.calc}</td>
        <td className="px-3 py-1.5 text-right">{line.amount ? line.amount.toLocaleString('ja-JP') : ''}</td>
      </tr>
    );
  }
  return (
    <tr>
      <td className="px-2 py-1"><input value={line.name} onChange={e => onChange({ name: e.target.value })} className={inputClass} aria-label="項目" /></td>
      <td className="px-2 py-1">
        <input value={line.calc} placeholder="例: 3000×280CUT"
          onChange={e => {
            // 金額が空か、前の積算メモの計算結果のままなら、新しい計算結果に追従させる
            const next = evaluateCalc(e.target.value);
            const follow = next !== null && (!line.amount || line.amount === computed);
            onChange({ calc: e.target.value, ...(follow ? { amount: next } : {}) });
          }}
          className={inputClass} aria-label="積算" />
        {computed !== null && computed !== line.amount && (
          <button type="button" onClick={() => onChange({ amount: computed })} className="mt-0.5 text-[11px] text-indigo-600 hover:underline">= {computed.toLocaleString('ja-JP')} を使う</button>
        )}
      </td>
      <td className="px-2 py-1"><NumberInput value={line.amount} onChange={amount => onChange({ amount })} className="min-w-[7rem]" /></td>
      <td className="py-1 pr-2"><button type="button" onClick={onRemove} className="p-1 text-red-400 hover:text-red-600" aria-label="行を削除"><X size={14} /></button></td>
    </tr>
  );
};

const SectionCard = ({ section, editing, onChange, onRemove, onMove }: {
  section: BudgetSection; editing: boolean;
  onChange: (next: BudgetSection) => void; onRemove: () => void; onMove: (delta: number) => void;
}) => (
  <section className="overflow-hidden border sm:rounded-lg border-earth-200 bg-white/70 break-inside-avoid">
    <div className="flex items-center gap-2 px-3 py-1.5 bg-earth-100/80">
      {editing ? (
        <>
          <input value={section.name} onChange={e => onChange({ ...section, name: e.target.value })} className={`${inputClass} font-semibold`} aria-label="大項目名" />
          <button type="button" onClick={() => onMove(-1)} className="p-1 text-earth-500 hover:text-earth-900" aria-label="上へ"><ArrowUp size={14} /></button>
          <button type="button" onClick={() => onMove(1)} className="p-1 text-earth-500 hover:text-earth-900" aria-label="下へ"><ArrowDown size={14} /></button>
          <button type="button" onClick={onRemove} className="p-1 text-red-400 hover:text-red-600" aria-label="大項目を削除"><X size={14} /></button>
        </>
      ) : <h4 className="flex-1 text-sm font-semibold text-center text-earth-800">{section.name}</h4>}
    </div>
    <table className="w-full text-sm">
      <colgroup><col className="w-[34%]" /><col /><col className="w-[28%]" />{editing && <col className="w-8" />}</colgroup>
      <tbody className="divide-y divide-earth-100">
        {section.lines.map((line, i) => (
          <LineRow key={line.id} line={line} editing={editing}
            onChange={patch => onChange({ ...section, lines: replaceAt(section.lines, i, patch) })}
            onRemove={() => onChange({ ...section, lines: removeAt(section.lines, i) })} />
        ))}
        {editing && (
          <tr><td colSpan={4} className="px-2 py-1">
            <button type="button" onClick={() => onChange({ ...section, lines: [...section.lines, emptyLine()] })} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"><Plus size={12} />行を追加</button>
          </td></tr>
        )}
        <tr className="font-semibold tabular-nums bg-earth-50/80">
          <td className="px-3 py-1.5 text-right text-earth-600" colSpan={2}>小計</td>
          <td className="px-3 py-1.5 text-right" colSpan={editing ? 2 : 1}>{yen(sectionSubtotal(section))}</td>
        </tr>
      </tbody>
    </table>
  </section>
);

const SummaryRow = ({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-4 px-4 py-2 ${strong ? 'bg-earth-100/70 font-bold text-earth-900' : ''}`}>
    <span className="text-sm">{label}{note && <span className="ml-2 text-xs font-normal text-earth-500">{note}</span>}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/** 予算表 (大項目 → 明細行 → 小計、直接費合計から管理費・粗利・総合計まで) */
const BudgetTab = ({ work, canWrite, onSave }: TabProps) => {
  const editor = useEditable<BudgetSheet>(work.budgetSheet, sheet => onSave({
    budgetSheet: {
      ...sheet,
      sections: sheet.sections.filter(s => s.name.trim() || s.lines.length > 0)
        .map(s => ({ ...s, lines: s.lines.filter(l => l.name.trim() || l.amount || l.calc.trim()) })),
    },
  }));
  const sheet = editor.draft;
  const set = (patch: Partial<BudgetSheet>) => editor.setDraft({ ...sheet, ...patch });
  const setSection = (i: number, next: BudgetSection) => set({ sections: replaceAt(sheet.sections, i, next) });
  const moveSection = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= sheet.sections.length) return;
    const sections = [...sheet.sections];
    [sections[i], sections[j]] = [sections[j], sections[i]];
    set({ sections });
  };

  const summary = budgetSummary(sheet);
  const multiplier = seriesMultiplier({ budgetSheet: sheet, episodes: work.episodes });
  const seriesTotal = summary.grandTotal * multiplier;
  const half = Math.ceil(sheet.sections.length / 2);

  const openPdf = () => window.open(`/print/work-budget/${work.id}`, '_blank', 'noopener');

  return (
    <div className="space-y-4">
      <Panel title="予算表" actions={
        <div className="flex gap-2">
          {!editor.editing && <button type="button" onClick={openPdf} className={`${btnSecondary} inline-flex items-center gap-1`}><FileDown size={14} />PDF出力</button>}
          <EditActions editor={editor} canWrite={canWrite} />
        </div>
      }>
        {editor.editing ? (
          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
            <label className="col-span-2 text-xs">表題<input value={sheet.title} onChange={e => set({ title: e.target.value })} placeholder="予算表案_3000万" className={inputClass} /></label>
            <label className="text-xs">作成日
              <div className="flex gap-1">
                <input type="date" value={sheet.createdDate} onChange={e => set({ createdDate: e.target.value })} className={inputClass} />
                <button type="button" onClick={() => set({ createdDate: formatYmdDash(new Date()) })} className={`${btnSecondary} whitespace-nowrap`}>今日</button>
              </div>
            </label>
            <label className="text-xs">予算の単位
              <select value={sheet.basis} onChange={e => set({ basis: e.target.value as BudgetSheet['basis'] })} className={inputClass}>
                <option value="episode">1話あたり (× {work.episodes.length}話)</option>
                <option value="series">シリーズ全体</option>
              </select>
            </label>
            <label className="text-xs">出資額を含む総合計額 (目標)<NumberInput value={sheet.targetTotal} onChange={v => set({ targetTotal: v })} /></label>
            <label className="text-xs">管理費率 (%)<NumberInput value={sheet.managementRate} onChange={v => set({ managementRate: v })} /></label>
            <label className="text-xs">出資額の率 (%)<NumberInput value={sheet.investmentRate} onChange={v => set({ investmentRate: v })} /></label>
            <label className="text-xs">グロス管理費 (B)<NumberInput value={sheet.grossManagementFee} onChange={v => set({ grossManagementFee: v })} /></label>
            <p className="col-span-2 text-xs lg:col-span-4 text-earth-500">
              積算欄に「60万×16か月÷12話」「3000×280CUT」のように入れると金額を自動計算します (単位の文字は無視、万は1万倍)。
              大項目はそのまま「原価予実」の工程・出納帳の工程になります。
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
            <p className="text-base font-bold text-earth-900">「{work.title}」{sheet.title}</p>
            <p className="text-xs text-earth-500">
              {sheet.basis === 'episode' ? `1話あたり (× ${work.episodes.length}話)` : 'シリーズ全体'}・単位: 円{sheet.createdDate && ` ・ ${sheet.createdDate} 作成`}
            </p>
          </div>
        )}
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        {[sheet.sections.slice(0, half), sheet.sections.slice(half)].map((column, c) => (
          <div key={c} className="space-y-3">
            {column.map((section, k) => {
              const i = c === 0 ? k : half + k;
              return <SectionCard key={section.id} section={section} editing={editor.editing}
                onChange={next => setSection(i, next)} onMove={delta => moveSection(i, delta)}
                onRemove={() => set({ sections: removeAt(sheet.sections, i) })} />;
            })}
          </div>
        ))}
      </div>
      {editor.editing && (
        <button type="button" onClick={() => set({ sections: [...sheet.sections, { id: newId(), name: '', lines: [emptyLine()] }] })} className={`${btnSecondary} inline-flex items-center gap-1 mx-4 sm:mx-0`}>
          <Plus size={14} />大項目を追加
        </button>
      )}

      <Panel title="集計">
        <div className="grid lg:grid-cols-2">
          <div className="divide-y divide-white/50">
            <SummaryRow label="直接費合計" value={yen(summary.direct)} strong />
            <SummaryRow label="管理費 (A)" note={`直接費合計 × ${sheet.managementRate}%`} value={yen(summary.management)} />
            <SummaryRow label="粗利 (C)" note={sheet.targetTotal > 0 ? `粗利率 ${pct(summary.profitRate)} (C ÷ 出資額を含む総合計額)` : '目標額を入れると計算します'} value={yen(summary.profit)} />
            <SummaryRow label="グロス管理費 (B)" value={yen(sheet.grossManagementFee)} />
            <SummaryRow label="グロス使用時の粗利" note="A - B + C" value={yen(summary.grossProfit)} />
            <SummaryRow label="管理費 + 粗利" note={`総合計の ${pct(summary.managementProfitRate)}`} value={yen(summary.managementProfit)} />
          </div>
          <div className="border-t divide-y lg:border-t-0 lg:border-l divide-white/50 border-white/50">
            <SummaryRow label="総合計" value={yen(summary.grandTotal)} strong />
            <SummaryRow label="出資額" note={`${sheet.investmentRate}%`} value={yen(summary.investment)} />
            <SummaryRow label="出資額を含む総合計額" value={yen(summary.target)} strong />
            {sheet.basis === 'episode' && <SummaryRow label={`総合計 シリーズ計 (× ${multiplier}話)`} value={yen(seriesTotal)} />}
            {sheet.basis === 'episode' && <SummaryRow label={`直接費 シリーズ計 (× ${multiplier}話)`} value={yen(summary.direct * multiplier)} />}
            {work.contractTotal > 0 && (
              <SummaryRow label="契約総額 − 総合計" note={`契約総額 ${yen(work.contractTotal)}`} value={yen(work.contractTotal - seriesTotal)} />
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default BudgetTab;
