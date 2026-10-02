import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Panel } from '../../components/DetailParts';
import { useModal } from '../../contexts';
import { formatYmdDash } from '../../utils/money';
import type { LicenseChannel, LicenseDeal, RoyaltyReport, SupervisionStatus } from '../../types';
import { licenseSummary, newId } from './workMetrics';
import { Badge, EmptyRow, NumberInput, StackedBar, type Tone } from './parts';
import { btnPrimary, btnSecondary, inputClass, removeAt, replaceAt, td, th, yen } from './ui';
import type { TabProps } from './OverviewTab';

const CHANNELS: LicenseChannel[] = ['国内配信', '海外配給', 'パッケージ', '商品化', 'イベント', 'タイアップ', 'その他'];
const SUPERVISION: SupervisionStatus[] = ['対象外', '未着手', '監修中', '修正依頼', '監修OK'];
const SUPERVISION_TONE: Record<SupervisionStatus, Tone> = { '対象外': 'gray', '未着手': 'gray', '監修中': 'yellow', '修正依頼': 'red', '監修OK': 'green' };

const emptyDeal = (): LicenseDeal => ({
  id: newId(), channel: '国内配信', licensee: '', title: '', mg: 0, mgPaid: false, supervision: '対象外', supervisionInvoiced: false, reports: [],
});

const DealEditor = ({ initial, onCancel, onSubmit, onDelete }: { initial: LicenseDeal; onCancel: () => void; onSubmit: (deal: LicenseDeal) => void; onDelete?: () => void }) => {
  const [d, setD] = useState(initial);
  const set = (patch: Partial<LicenseDeal>) => setD({ ...d, ...patch });
  const setReport = (i: number, patch: Partial<RoyaltyReport>) => set({ reports: replaceAt(d.reports, i, patch) });
  return (
    <div className="p-3 m-3 space-y-3 rounded-md bg-earth-50">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs">区分
          <select value={d.channel} onChange={e => set({ channel: e.target.value as LicenseChannel })} className={inputClass}>{CHANNELS.map(c => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="text-xs">許諾先・窓口<input value={d.licensee} onChange={e => set({ licensee: e.target.value })} className={inputClass} /></label>
        <label className="col-span-2 text-xs">案件名・商品名<input value={d.title} onChange={e => set({ title: e.target.value })} className={inputClass} /></label>
        <label className="text-xs">MG (前受金)<NumberInput value={d.mg} onChange={v => set({ mg: v })} /></label>
        <label className="text-xs">MG 入金期日<input type="date" value={d.mgDueDate ?? ''} onChange={e => set({ mgDueDate: e.target.value })} className={inputClass} /></label>
        <label className="text-xs">ロイヤリティ料率 (%)<NumberInput value={d.royaltyRate ?? 0} onChange={v => set({ royaltyRate: v })} /></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={d.mgPaid} onChange={e => set({ mgPaid: e.target.checked })} />MG 入金済</label>
        <label className="text-xs">許諾期間 開始<input type="date" value={d.termStart ?? ''} onChange={e => set({ termStart: e.target.value })} className={inputClass} /></label>
        <label className="text-xs">許諾期間 終了<input type="date" value={d.termEnd ?? ''} onChange={e => set({ termEnd: e.target.value })} className={inputClass} /></label>
        <label className="col-span-2 text-xs">備考<input value={d.remarks ?? ''} onChange={e => set({ remarks: e.target.value })} className={inputClass} /></label>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-earth-700">ロイヤリティ報告</p>
        <div className="space-y-2">
          {d.reports.map((r, i) => (
            <div key={r.id} className="grid items-end grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
              <label className="text-xs">対象期間<input value={r.period} onChange={e => setReport(i, { period: e.target.value })} placeholder="2026年4-6月" className={inputClass} /></label>
              <label className="text-xs">報告期日<input type="date" value={r.dueDate} onChange={e => setReport(i, { dueDate: e.target.value })} className={inputClass} /></label>
              <label className="text-xs">ロイヤリティ額<NumberInput value={r.amount} onChange={v => setReport(i, { amount: v })} className="w-32" /></label>
              <label className="text-xs">入金日<input type="date" value={r.paidDate ?? ''} onChange={e => setReport(i, { paidDate: e.target.value })} className={inputClass} /></label>
              <button type="button" onClick={() => set({ reports: removeAt(d.reports, i) })} className="px-2 pb-1 text-red-500" aria-label="削除">×</button>
            </div>
          ))}
          <button type="button" onClick={() => set({ reports: [...d.reports, { id: newId(), period: '', dueDate: '', amount: 0, received: false, invoiced: false, paid: false }] })} className={btnSecondary}>報告期を追加</button>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onDelete && <button type="button" onClick={onDelete} className="px-3 py-1.5 mr-auto text-xs text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50">この案件を削除</button>}
        <button type="button" onClick={onCancel} className={btnSecondary}>キャンセル</button>
        <button type="button" onClick={() => onSubmit({ ...d, licensee: d.licensee.trim(), title: d.title.trim() })} disabled={!d.licensee.trim() && !d.title.trim()} className={btnPrimary}>保存</button>
      </div>
    </div>
  );
};

const ReportTable = ({ deal, canWrite, onChange }: { deal: LicenseDeal; canWrite: boolean; onChange: (reports: RoyaltyReport[]) => void }) => {
  const { overageByReport } = licenseSummary(deal);
  const toggle = (r: RoyaltyReport, key: 'received' | 'invoiced' | 'paid') => onChange(deal.reports.map(x => (x.id === r.id ? {
    ...x, [key]: !x[key], ...(key === 'paid' && !x.paid && !x.paidDate ? { paidDate: formatYmdDash(new Date()) } : {}),
  } : x)));
  const today = formatYmdDash(new Date());
  return (
    <table className="min-w-full text-xs">
      <thead className="text-left text-earth-500">
        <tr><th className={th}>対象期間</th><th className={th}>報告期日</th><th className={`${th} text-right`}>ロイヤリティ</th><th className={`${th} text-right`}>MG超過 (請求対象)</th><th className={th}>報告書受領</th><th className={th}>請求</th><th className={th}>入金確認</th></tr>
      </thead>
      <tbody className="divide-y divide-white/40 tabular-nums">
        {deal.reports.length === 0 && <EmptyRow colSpan={7}>ロイヤリティ報告はまだありません。</EmptyRow>}
        {[...deal.reports].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).map(r => {
          const late = !r.received && !!r.dueDate && r.dueDate < today;
          const overage = overageByReport[r.id] ?? 0;
          return (
            <tr key={r.id}>
              <td className={td}>{r.period || '—'}</td>
              <td className={`${td} ${late ? 'text-red-700 font-semibold' : ''}`}>{r.dueDate || '—'}{late && ' (未着)'}</td>
              <td className={`${td} text-right`}>{yen(r.amount)}</td>
              <td className={`${td} text-right`}>{overage > 0 ? yen(overage) : <span className="text-earth-400">MG充当</span>}</td>
              {(['received', 'invoiced', 'paid'] as const).map(key => (
                <td key={key} className={td}>
                  <input type="checkbox" checked={r[key]} disabled={!canWrite || (key === 'invoiced' && overage === 0 && !r.invoiced)} onChange={() => toggle(r, key)} />
                  {key === 'paid' && r.paidDate && <span className="ml-1 text-earth-500">{r.paidDate}</span>}
                  {key === 'invoiced' && r.received && !r.invoiced && overage > 0 && <span className="ml-1"><Badge tone="yellow">請求可</Badge></span>}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

/** ライセンス・商品化・二次利用の収支トラッカー */
const LicenseTab = ({ work, canWrite, onSave }: TabProps) => {
  const { showModal } = useModal();
  const [editing, setEditing] = useState<LicenseDeal | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<LicenseChannel | 'all'>('all');

  const saveDeals = (licenses: LicenseDeal[]) => onSave({ licenses });
  const updateDeal = (id: string, patch: Partial<LicenseDeal>) => saveDeals(work.licenses.map(l => (l.id === id ? { ...l, ...patch } : l)));
  const submit = async (deal: LicenseDeal) => {
    const exists = work.licenses.some(l => l.id === deal.id);
    await saveDeals(exists ? work.licenses.map(l => (l.id === deal.id ? deal : l)) : [...work.licenses, deal]);
    setEditing(null);
  };
  const remove = (deal: LicenseDeal) => showModal({
    title: '許諾案件の削除', message: `${deal.licensee} ${deal.title} を削除しますか？`, onCancel: () => {},
    onConfirm: async () => { await saveDeals(work.licenses.filter(l => l.id !== deal.id)); setEditing(null); },
  });

  const summaries = new Map(work.licenses.map(l => [l.id, licenseSummary(l)]));
  const channelRows = CHANNELS.map(c => {
    const deals = work.licenses.filter(l => l.channel === c);
    return {
      channel: c, count: deals.length,
      mg: deals.reduce((s, l) => s + (l.mg || 0), 0),
      earned: deals.reduce((s, l) => s + summaries.get(l.id)!.earned, 0),
      collected: deals.reduce((s, l) => s + (l.mgPaid ? l.mg || 0 : 0) + l.reports.filter(r => r.paid).reduce((x, r) => x + (summaries.get(l.id)!.overageByReport[r.id] ?? 0), 0), 0),
    };
  }).filter(r => r.count > 0);
  const visible = work.licenses.filter(l => channel === 'all' || l.channel === channel);
  const actionCount = work.licenses.reduce((s, l) => { const x = summaries.get(l.id)!; return s + x.billableReports + (x.supervisionBillable ? 1 : 0); }, 0);

  return (
    <div className="space-y-4">
      <Panel title="窓口別の回収状況">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-left text-earth-500">
              <tr><th className={th}>区分</th><th className={`${th} text-right`}>案件数</th><th className={`${th} text-right`}>MG 合計</th><th className={`${th} text-right`}>報告ロイヤリティ累計</th><th className={`${th} text-right`}>回収済み</th></tr>
            </thead>
            <tbody className="divide-y divide-white/40 tabular-nums">
              {channelRows.length === 0 && <EmptyRow colSpan={5}>許諾案件はまだありません。</EmptyRow>}
              {channelRows.map(r => (
                <tr key={r.channel}>
                  <td className={td}>{r.channel}</td><td className={`${td} text-right`}>{r.count}</td><td className={`${td} text-right`}>{yen(r.mg)}</td>
                  <td className={`${td} text-right`}>{yen(r.earned)}</td><td className={`${td} text-right`}>{yen(r.collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title={<>許諾案件 {actionCount > 0 && <span className="ml-2"><Badge tone="yellow">請求可 {actionCount}件</Badge></span>}</>}
        actions={
          <div className="flex items-center gap-2">
            <select value={channel} onChange={e => setChannel(e.target.value as LicenseChannel | 'all')} className="py-1 text-xs border-gray-300 rounded-md">
              <option value="all">すべての区分</option>{CHANNELS.map(c => <option key={c}>{c}</option>)}
            </select>
            {canWrite && !editing && <button type="button" onClick={() => setEditing(emptyDeal())} className={btnPrimary}>案件を追加</button>}
          </div>
        }
      >
        {editing && !work.licenses.some(l => l.id === editing.id) && <DealEditor initial={editing} onCancel={() => setEditing(null)} onSubmit={submit} />}
        <ul className="divide-y divide-white/40">
          {visible.length === 0 && !editing && <li className="px-4 py-6 text-sm text-center text-earth-500">該当する案件はありません。</li>}
          {visible.map(deal => {
            const s = summaries.get(deal.id)!;
            const open = expanded.has(deal.id);
            if (editing?.id === deal.id) return <li key={deal.id}><DealEditor initial={editing} onCancel={() => setEditing(null)} onSubmit={submit} onDelete={() => remove(deal)} /></li>;
            return (
              <li key={deal.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start gap-3">
                  <button type="button" onClick={() => setExpanded(prev => { const next = new Set(prev); if (open) next.delete(deal.id); else next.add(deal.id); return next; })}
                    className="mt-0.5 text-earth-500" aria-label={open ? '閉じる' : 'ロイヤリティ報告を開く'}>
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1 min-w-[14rem]">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-earth-900">
                      <Badge tone="earth">{deal.channel}</Badge>{deal.licensee}<span className="font-normal text-earth-600">{deal.title}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-earth-500 tabular-nums">
                      {deal.termStart || deal.termEnd ? `許諾期間 ${deal.termStart ?? ''}〜${deal.termEnd ?? ''}` : '許諾期間 未設定'}
                      {deal.royaltyRate ? ` ・ 料率 ${deal.royaltyRate}%` : ''}
                      {deal.remarks ? ` ・ ${deal.remarks}` : ''}
                    </p>
                    {deal.mg > 0 && (
                      <div className="max-w-md mt-2">
                        <StackedBar total={deal.mg} segments={[
                          { label: 'MG 消化', value: s.mgConsumed, className: 'bg-earth-500' },
                          { label: 'MG 残', value: s.mgRemaining, className: 'bg-earth-200' },
                          { label: 'MG 超過 (ランニング)', value: s.overage, className: 'bg-[#8B9A8B]' },
                        ]} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-xs">
                    <span className="tabular-nums">MG {yen(deal.mg)} {deal.mg > 0 && (deal.mgPaid ? <Badge tone="green">入金済</Badge> : <Badge tone="gray">未入金{deal.mgDueDate ? ` (${deal.mgDueDate})` : ''}</Badge>)}</span>
                    <span className="flex items-center gap-1.5">監修
                      {canWrite ? (
                        <select value={deal.supervision} onChange={e => updateDeal(deal.id, { supervision: e.target.value as SupervisionStatus })} className="py-0.5 text-xs border-gray-300 rounded-md">
                          {SUPERVISION.map(x => <option key={x}>{x}</option>)}
                        </select>
                      ) : <Badge tone={SUPERVISION_TONE[deal.supervision]}>{deal.supervision}</Badge>}
                    </span>
                    {deal.supervision === '監修OK' && (
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={deal.supervisionInvoiced} disabled={!canWrite} onChange={e => updateDeal(deal.id, { supervisionInvoiced: e.target.checked })} />
                        監修OK分を請求済み {s.supervisionBillable && <Badge tone="yellow">請求可</Badge>}
                      </label>
                    )}
                    {s.billableReports > 0 && <Badge tone="yellow">ロイヤリティ請求可 {s.billableReports}件</Badge>}
                    {canWrite && <button type="button" onClick={() => setEditing(deal)} className="text-indigo-600 hover:underline">編集</button>}
                  </div>
                </div>
                {open && (
                  <div className="mt-3 overflow-x-auto rounded-md ml-7 bg-white/50">
                    <ReportTable deal={deal} canWrite={canWrite} onChange={reports => updateDeal(deal.id, { reports })} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
};

export default LicenseTab;
