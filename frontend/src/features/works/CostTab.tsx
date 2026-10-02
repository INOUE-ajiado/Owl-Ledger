import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Panel } from '../../components/DetailParts';
import { useModal } from '../../contexts';
import { useVendors } from '../../hooks/useMasters';
import { formatYmdDash } from '../../utils/money';
import type { CostCategory, Work, WorkCost, WorkEpisode } from '../../types';
import { categoryBreakdown, episodeBreakdown, episodeLabel, type CostItem } from './workMetrics';
import { budgetSummary, costSections, seriesMultiplier } from './budgetSheet';
import { deleteWorkCost, saveWorkCost } from './workApi';
import { Badge, BudgetBar, EditActions, EmptyRow, NumberInput } from './parts';
import { btnPrimary, btnSecondary, inputClass, replaceAt, statusLabel, statusTone, td, th, useEditable, yen } from './ui';
import type { TabProps } from './OverviewTab';

type CostDraft = Omit<WorkCost, 'id'>;

const withoutId = ({ id: _id, ...rest }: WorkCost): CostDraft => rest; // eslint-disable-line @typescript-eslint/no-unused-vars

const emptyCost = (work: Work): CostDraft => ({ date: formatYmdDash(new Date()), payee: '', description: '', category: costSections(work).find(c => c.id === 'animation')?.id ?? costSections(work)[0]?.id ?? '', episode: 0, amount: 0, paid: false });

const CategoryPanel = ({ work, items, onOpenBudget }: TabProps & { items: CostItem[]; onOpenBudget: () => void }) => {
  const rows = categoryBreakdown(work, items);
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const grossProfit = work.contractTotal - totalActual;
  const multiplier = seriesMultiplier(work);

  return (
    <Panel title="工程別予算枠 (P/L ブレイクダウン)" actions={<button type="button" onClick={onOpenBudget} className={btnSecondary}>予算表で編集</button>}>
      <p className="px-4 pt-2 text-xs text-earth-500">
        予算は予算表の小計{multiplier > 1 ? ` × ${multiplier}話` : ''} (シリーズ全体) です。
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-left text-earth-500">
            <tr><th className={th}>工程</th><th className={`${th} text-right`}>予算</th><th className={`${th} text-right`}>実績</th><th className={`${th} text-right`}>残</th><th className={`${th} w-1/4`}>消化率</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-white/40 tabular-nums">
            {rows.map(r => (
              <tr key={r.key}>
                <td className={`${td} min-w-[9rem] font-medium text-earth-900 whitespace-nowrap`}>{r.label}</td>
                <td className={`${td} text-right whitespace-nowrap`}>{yen(r.budget)}</td>
                <td className={`${td} text-right whitespace-nowrap`}>{yen(r.actual)}</td>
                <td className={`${td} text-right whitespace-nowrap ${r.budget - r.actual < 0 ? 'text-red-700' : ''}`}>{yen(r.budget - r.actual)}</td>
                <td className={td}>
                  <div className="flex items-center gap-2"><BudgetBar budget={r.budget} actual={r.actual} status={r.status} /><span className="w-12 text-xs text-right">{r.rate === null ? '—' : `${Math.round(r.rate * 100)}%`}</span></div>
                </td>
                <td className={td}><Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge></td>
              </tr>
            ))}
            <tr className="font-semibold bg-white/40">
              <td className={td}>直接費 合計</td>
              <td className={`${td} text-right`}>{yen(totalBudget)}</td>
              <td className={`${td} text-right`}>{yen(totalActual)}</td>
              <td className={`${td} text-right ${totalBudget - totalActual < 0 ? 'text-red-700' : ''}`}>{yen(totalBudget - totalActual)}</td>
              <td className={td} colSpan={2}>
                <span className="text-xs font-normal text-earth-600">契約総額との差 (粗利見込) <span className={`font-semibold ${grossProfit < 0 ? 'text-red-700' : 'text-earth-900'}`}>{yen(grossProfit)}</span></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {totalBudget > work.contractTotal && work.contractTotal > 0 && (
        <p className="flex items-center gap-1.5 px-4 py-2 text-xs text-amber-700"><AlertTriangle size={14} />直接費の予算合計が契約総額 {yen(work.contractTotal)} を上回っています。</p>
      )}
    </Panel>
  );
};

const EpisodePanel = ({ work, canWrite, onSave, items }: TabProps & { items: CostItem[] }) => {
  const editor = useEditable(work.episodes, episodes => onSave({ episodes }));
  const rows = episodeBreakdown({ episodes: editor.draft }, items);
  const overCount = rows.filter(r => r.status === 'over').length;
  const shared = items.filter(i => i.episode === 0).reduce((s, i) => s + i.amount, 0);

  const resize = (count: number) => {
    const next: WorkEpisode[] = Array.from({ length: Math.max(0, Math.min(100, count)) }, (_, i) => editor.draft[i] ?? { no: i + 1, budget: editor.draft[0]?.budget ?? 0 });
    editor.setDraft(next);
  };

  return (
    <Panel
      title={<>話数別コスト消化 {overCount > 0 && <span className="ml-2"><Badge tone="red">{overCount}話 予算超過</Badge></span>}</>}
      actions={<EditActions editor={editor} canWrite={canWrite} />}
    >
      {editor.editing && (
        <div className="flex flex-wrap items-end gap-3 px-4 pt-3">
          <label className="text-xs">話数<NumberInput value={editor.draft.length} onChange={resize} className="w-24" /></label>
          <button type="button" className={btnSecondary} onClick={() => {
            const first = editor.draft[0]?.budget ?? 0;
            editor.setDraft(editor.draft.map(e => ({ ...e, budget: first })));
          }}>#01 の予算を全話に適用</button>
          {work.budgetSheet.basis === 'episode' && (
            <button type="button" className={btnSecondary} onClick={() => {
              const direct = budgetSummary(work.budgetSheet).direct;
              editor.setDraft(editor.draft.map(e => ({ ...e, budget: direct })));
            }}>予算表の直接費 ({yen(budgetSummary(work.budgetSheet).direct)}) を全話に適用</button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {rows.map(r => {
          const index = editor.draft.findIndex(e => e.no === r.key);
          return (
            <div key={r.key} className={`p-3 rounded-lg border ${r.status === 'over' ? 'border-red-300 bg-red-50/70' : r.status === 'warn' ? 'border-amber-200 bg-amber-50/60' : 'border-white/60 bg-white/50'}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-earth-900">{episodeLabel(r.key)}</span>
                <Badge tone={statusTone(r.status)}>{r.rate === null ? statusLabel(r.status) : `${Math.round(r.rate * 100)}%`}</Badge>
              </div>
              {editor.editing && index >= 0 ? (
                <>
                  <input value={editor.draft[index].title ?? ''} onChange={e => editor.setDraft(replaceAt(editor.draft, index, { title: e.target.value }))} placeholder="サブタイトル" className={`${inputClass} mt-2`} />
                  <label className="block mt-1 text-[11px] text-earth-500">予算<NumberInput value={editor.draft[index].budget} onChange={v => editor.setDraft(replaceAt(editor.draft, index, { budget: v }))} /></label>
                </>
              ) : (
                <>
                  {work.episodes[index]?.title && <p className="text-xs truncate text-earth-600">{work.episodes[index].title}</p>}
                  <p className="mt-1 text-sm font-semibold tabular-nums text-earth-900">{yen(r.actual)}</p>
                  <p className="mb-1.5 text-[11px] tabular-nums text-earth-500">予算 {yen(r.budget)}</p>
                  <BudgetBar budget={r.budget} actual={r.actual} status={r.status} />
                </>
              )}
            </div>
          );
        })}
      </div>
      {shared > 0 && <p className="px-4 pb-3 text-xs text-earth-500">話数を特定しない共通費: {yen(shared)}</p>}
    </Panel>
  );
};

const CostEditor = ({ work, initial, onCancel, onSubmit }: { work: Work; initial: CostDraft; onCancel: () => void; onSubmit: (cost: CostDraft) => Promise<void> }) => {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { vendors } = useVendors();
  const set = (patch: Partial<CostDraft>) => setD({ ...d, ...patch });
  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit({ ...d, payee: d.payee.trim(), description: d.description.trim() });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="grid grid-cols-2 gap-2 p-3 m-3 rounded-md sm:grid-cols-4 lg:grid-cols-8 bg-earth-50">
      <label className="text-xs">支払日 (予定)<input type="date" value={d.date} onChange={e => set({ date: e.target.value })} className={inputClass} /></label>
      <label className="col-span-1 text-xs lg:col-span-2">支払先
        <input list="work-cost-vendors" value={d.payee} onChange={e => {
          const vendor = vendors.find(v => v.name === e.target.value);
          set({ payee: e.target.value, vendorId: vendor?.id });
        }} className={inputClass} />
      </label>
      <label className="col-span-2 text-xs">内容<input value={d.description} onChange={e => set({ description: e.target.value })} placeholder="原画 20カット など" className={inputClass} /></label>
      <label className="text-xs">工程
        <select value={d.category} onChange={e => set({ category: e.target.value as CostCategory })} className={inputClass}>
          {costSections(work).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          {!costSections(work).some(c => c.id === d.category) && <option value={d.category}>未分類</option>}
        </select>
      </label>
      <label className="text-xs">話数
        <select value={d.episode} onChange={e => set({ episode: Number(e.target.value) })} className={inputClass}>
          <option value={0}>共通</option>
          {Array.from({ length: 100 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{episodeLabel(n)}</option>)}
        </select>
      </label>
      <label className="text-xs">金額 (税抜)<NumberInput value={d.amount} onChange={v => set({ amount: v })} /></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={d.paid} onChange={e => set({ paid: e.target.checked })} />支払済</label>
      <div className="flex items-end justify-end col-span-2 gap-2 sm:col-span-4 lg:col-span-8">
        <button type="button" onClick={onCancel} className={btnSecondary}>キャンセル</button>
        <button type="button" onClick={submit} disabled={saving || !d.date || d.amount <= 0} className={btnPrimary}>{saving ? '保存中...' : '保存'}</button>
      </div>
      <datalist id="work-cost-vendors">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
    </div>
  );
};

const CostListPanel = ({ work, canWrite, costs, ledgerItems }: TabProps & { costs: WorkCost[]; ledgerItems: CostItem[] }) => {
  const { showModal } = useModal();
  const [editing, setEditing] = useState<WorkCost | 'new' | null>(null);
  const [episodeFilter, setEpisodeFilter] = useState<number | 'all'>('all');
  const sectionLabel = new Map(costSections(work).map(c => [c.id, c.label]));

  const submit = async (cost: CostDraft) => {
    try {
      await saveWorkCost(work, cost, editing && editing !== 'new' ? editing : undefined);
      setEditing(null);
    } catch (error) {
      console.error('原価の保存に失敗しました:', error);
      showModal({ title: 'エラー', message: '保存に失敗しました。' });
    }
  };

  const remove = (cost: WorkCost) => showModal({
    title: '原価の削除', message: `${cost.date} ${cost.payee} ${yen(cost.amount)} を削除しますか？`,
    onCancel: () => {},
    onConfirm: async () => {
      try {
        await deleteWorkCost(work, cost);
      } catch (error) {
        console.error('原価の削除に失敗しました:', error);
        showModal({ title: 'エラー', message: '削除に失敗しました。' });
      }
    },
  });

  type Row = { key: string; cost?: WorkCost; item: CostItem };
  const rows: Row[] = [
    ...costs.map(c => ({ key: c.id, cost: c, item: { date: c.date, category: c.category, episode: c.episode || 0, amount: c.amount, income: 0, source: 'cost' as const, label: [c.payee, c.description].filter(Boolean).join(' / '), paid: c.paid } })),
    ...ledgerItems.filter(i => i.amount > 0).map((item, i) => ({ key: `ledger-${i}`, item })),
  ].filter(r => episodeFilter === 'all' || r.item.episode === episodeFilter)
    .sort((a, b) => b.item.date.localeCompare(a.item.date));
  const episodes = Array.from(new Set([...costs.map(c => c.episode || 0), ...ledgerItems.map(i => i.episode)])).sort((a, b) => a - b);

  return (
    <Panel title={`原価明細 (外注請求書・支払予定 / 出納帳)`} actions={
      <div className="flex items-center gap-2">
        <select value={episodeFilter} onChange={e => setEpisodeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="py-1 text-xs border-gray-300 rounded-md">
          <option value="all">全話数</option>
          {episodes.map(n => <option key={n} value={n}>{episodeLabel(n)}</option>)}
        </select>
        {canWrite && editing === null && <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>原価を追加</button>}
      </div>
    }>
      {editing === 'new' && <CostEditor work={work} initial={emptyCost(work)} onCancel={() => setEditing(null)} onSubmit={submit} />}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-left text-earth-500">
            <tr><th className={th}>支払日</th><th className={th}>話数</th><th className={th}>工程</th><th className={th}>支払先 / 内容</th><th className={`${th} text-right`}>金額</th><th className={th}>状態</th><th className={th} /></tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {rows.length === 0 && <EmptyRow colSpan={7}>原価はまだありません。出納帳の明細も「作品」を選ぶとここに集計されます。</EmptyRow>}
            {rows.map(({ key, cost, item }) => editing !== null && editing !== 'new' && cost && editing.id === cost.id ? (
              <tr key={key}><td colSpan={7}><CostEditor work={work} initial={withoutId(cost)} onCancel={() => setEditing(null)} onSubmit={submit} /></td></tr>
            ) : (
              <tr key={key} className="tabular-nums">
                <td className={`${td} whitespace-nowrap`}>{item.date}</td>
                <td className={`${td} font-mono text-xs`}>{episodeLabel(item.episode)}</td>
                <td className={`${td} whitespace-nowrap text-earth-700`}>{sectionLabel.get(item.category) ?? '未分類'}</td>
                <td className={`${td} text-earth-800`}>{item.label || '—'}</td>
                <td className={`${td} text-right whitespace-nowrap`}>{yen(item.amount)}</td>
                <td className={td}>{item.source === 'ledger' ? <Badge tone="earth">出納帳</Badge> : item.paid ? <Badge tone="green">支払済</Badge> : <Badge tone="yellow">支払予定</Badge>}</td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  {canWrite && cost && (
                    <span className="flex justify-end gap-3 text-xs">
                      <button type="button" onClick={() => setEditing(cost)} className="text-indigo-600 hover:underline">編集</button>
                      <button type="button" onClick={() => remove(cost)} className="text-red-600 hover:underline">削除</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

/** 話数・工程別の原価予実 (出納・支払連動) */
const CostTab = (props: TabProps & { costs: WorkCost[]; items: CostItem[]; ledgerItems: CostItem[]; onOpenBudget: () => void }) => (
  <div className="space-y-4">
    <CategoryPanel {...props} />
    <EpisodePanel {...props} />
    <CostListPanel {...props} />
  </div>
);

export default CostTab;
