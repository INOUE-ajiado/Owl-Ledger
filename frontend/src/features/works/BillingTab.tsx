import { AlertTriangle, Check } from 'lucide-react';
import { Panel } from '../../components/DetailParts';
import { useModal } from '../../contexts';
import { nextDocNumber } from '../../api/numbering';
import { formatYmdDash } from '../../utils/money';
import type { DeliveryStatus, MilestoneInvoiceStatus, WorkMilestone } from '../../types';
import { applyDeliveryStatus, billingSummary, DELIVERY_STATUSES, newId } from './workMetrics';
import { Badge, EditActions, EmptyRow, NumberInput, StackedBar, type Tone } from './parts';
import { btnSecondary, inputClass, removeAt, replaceAt, td, th, useEditable, yen } from './ui';
import type { TabProps } from './OverviewTab';

const INVOICE_STATUSES: MilestoneInvoiceStatus[] = ['未起票', '下書き', '発行済', '入金済'];
const INVOICE_TONE: Record<MilestoneInvoiceStatus, Tone> = { '未起票': 'gray', '下書き': 'yellow', '発行済': 'blue', '入金済': 'green' };
const DELIVERY_TONE: Record<DeliveryStatus, Tone> = { '未着手': 'gray', '進行中': 'yellow', '納品完了': 'blue', '検収完了': 'green' };

/** 節目の進み具合を横並びで見せる */
const Timeline = ({ milestones }: { milestones: WorkMilestone[] }) => (
  <ol className="flex gap-1 px-4 py-4 overflow-x-auto">
    {milestones.map((m, i) => {
      const done = m.invoiceStatus === '入金済';
      const active = !done && (m.deliveryStatus !== '未着手' || m.invoiceStatus !== '未起票');
      return (
        <li key={m.id} className="flex items-center flex-1 min-w-[9rem]">
          <div className="flex flex-col items-center flex-1 text-center">
            <span className={`flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full ${done ? 'bg-[#8B9A8B] text-white' : active ? 'bg-earth-500 text-white' : 'bg-earth-100 text-earth-500'}`}>
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span className="mt-1 text-xs font-medium text-earth-900">{m.name}</span>
            <span className="text-[11px] tabular-nums text-earth-500">{m.plannedDate || '日付未定'}</span>
            <span className="mt-1"><Badge tone={INVOICE_TONE[m.invoiceStatus]}>{m.invoiceStatus}</Badge></span>
          </div>
          {i < milestones.length - 1 && <span className="flex-shrink-0 w-6 h-px bg-earth-200" />}
        </li>
      );
    })}
  </ol>
);

/** 資金回収・マイルストーン進捗 (請求連動) */
const BillingTab = ({ work, canWrite, onSave }: TabProps) => {
  const { showModal } = useModal();
  const today = new Date();
  const summary = billingSummary(work, today);
  const editor = useEditable(work.milestones, milestones => onSave({ milestones: milestones.filter(m => m.name.trim()) }));

  const changeDelivery = async (m: WorkMilestone, status: DeliveryStatus) => {
    const milestones = applyDeliveryStatus(work.milestones, m.id, status, today);
    await onSave({ milestones });
    if (m.invoiceStatus === '未起票' && milestones.find(x => x.id === m.id)?.invoiceStatus === '下書き') {
      showModal({ title: '請求書の下書きを起票しました', message: `「${m.name}」が${status}になったため、${yen(m.amount)} の請求書を下書きにしました。\n内容を確認して「発行済」にしてください。` });
    }
  };

  const changeInvoice = async (m: WorkMilestone, status: MilestoneInvoiceStatus) => {
    const patch: Partial<WorkMilestone> = { invoiceStatus: status };
    const todayStr = formatYmdDash(today);
    if ((status === '発行済' || status === '入金済') && !m.invoiceNumber) {
      try {
        patch.invoiceNumber = await nextDocNumber('I', today);
      } catch (error) {
        console.error('請求書番号の採番に失敗しました:', error);
        showModal({ title: 'エラー', message: '請求書番号の採番に失敗しました。' });
        return;
      }
      patch.issueDate = m.issueDate || todayStr;
    }
    if (status === '入金済' && !m.paidDate) patch.paidDate = todayStr;
    await onSave({ milestones: work.milestones.map(x => (x.id === m.id ? { ...x, ...patch } : x)) });
  };

  const allocationGap = summary.contractTotal - summary.scheduled;
  const d = editor.draft;

  return (
    <div className="space-y-4">
      <Panel title="未請求残高">
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-earth-600">契約総額 <span className="text-lg font-bold tabular-nums text-earth-900">{yen(summary.contractTotal)}</span></p>
            <p className="text-sm text-earth-600">未請求 (未回収リスク) <span className="text-lg font-bold text-red-700 tabular-nums">{yen(summary.unbilled)}</span></p>
          </div>
          <StackedBar total={summary.contractTotal} segments={[
            { label: '入金済', value: summary.paid, className: 'bg-[#8B9A8B]' },
            { label: '請求済・未入金', value: summary.outstanding, className: 'bg-sky-400' },
            { label: '下書き', value: summary.draft, className: 'bg-amber-300' },
            { label: '未請求', value: Math.max(0, summary.unbilled - summary.draft), className: 'bg-earth-200' },
          ]} />
          {allocationGap !== 0 && summary.contractTotal > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700"><AlertTriangle size={14} />
              節目に割り振った請求額の合計 ({yen(summary.scheduled)}) が契約総額と {yen(Math.abs(allocationGap))} {allocationGap > 0 ? '不足' : '超過'}しています。
            </p>
          )}
          {summary.overdue.map(m => (
            <p key={m.id} className="flex items-center gap-1.5 text-xs text-red-700"><AlertTriangle size={14} />
              「{m.name}」{yen(m.amount)} が入金予定日 {m.dueDate} を過ぎても未入金です。
            </p>
          ))}
        </div>
      </Panel>

      <Panel title="分割請求タイムライン" actions={<EditActions editor={editor} canWrite={canWrite} />}>
        {!editor.editing && <Timeline milestones={work.milestones} />}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-left text-earth-500">
              <tr>
                <th className={th}>フェーズ</th><th className={th}>納品物</th><th className={th}>予定日</th><th className={`${th} text-right`}>請求額 (税抜)</th>
                <th className={th}>{editor.editing ? '起票トリガー' : '納品ステータス'}</th><th className={th}>請求</th>
                <th className={th}>請求書番号</th><th className={th}>発行日</th><th className={th}>入金予定日</th><th className={th}>入金日 (消込)</th>
                {editor.editing && <th className={th} />}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {d.length === 0 && <EmptyRow colSpan={10}>節目が登録されていません。</EmptyRow>}
              {editor.editing ? d.map((m, i) => {
                const set = (patch: Partial<WorkMilestone>) => editor.setDraft(replaceAt(d, i, patch));
                return (
                  <tr key={m.id}>
                    <td className={td}><input value={m.name} onChange={e => set({ name: e.target.value })} className={`${inputClass} min-w-[9rem]`} /></td>
                    <td className={td}><input value={m.deliverable} onChange={e => set({ deliverable: e.target.value })} className={`${inputClass} min-w-[8rem]`} /></td>
                    <td className={td}><input type="date" value={m.plannedDate} onChange={e => set({ plannedDate: e.target.value })} className={inputClass} /></td>
                    <td className={td}><NumberInput value={m.amount} onChange={v => set({ amount: v })} className="min-w-[7rem]" /></td>
                    <td className={td}>
                      <select value={m.trigger} onChange={e => set({ trigger: e.target.value as WorkMilestone['trigger'] })} className={inputClass}>
                        <option>納品完了</option><option>検収完了</option>
                      </select>
                    </td>
                    <td className={td}><Badge tone={INVOICE_TONE[m.invoiceStatus]}>{m.invoiceStatus}</Badge></td>
                    <td className={td}><input value={m.invoiceNumber ?? ''} onChange={e => set({ invoiceNumber: e.target.value })} className={`${inputClass} min-w-[8rem]`} /></td>
                    <td className={td}><input type="date" value={m.issueDate ?? ''} onChange={e => set({ issueDate: e.target.value })} className={inputClass} /></td>
                    <td className={td}><input type="date" value={m.dueDate ?? ''} onChange={e => set({ dueDate: e.target.value })} className={inputClass} /></td>
                    <td className={td}><input type="date" value={m.paidDate ?? ''} onChange={e => set({ paidDate: e.target.value })} className={inputClass} /></td>
                    <td className={td}><button type="button" onClick={() => editor.setDraft(removeAt(d, i))} className="px-2 text-red-500" aria-label="削除">×</button></td>
                  </tr>
                );
              }) : work.milestones.map(m => (
                <tr key={m.id} className="tabular-nums">
                  <td className={`${td} font-medium text-earth-900 whitespace-nowrap`}>{m.name}</td>
                  <td className={`${td} text-earth-600`}>{m.deliverable}</td>
                  <td className={`${td} whitespace-nowrap`}>{m.plannedDate || '—'}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>{yen(m.amount)}</td>
                  <td className={td}>
                    {canWrite ? (
                      <select value={m.deliveryStatus} onChange={e => changeDelivery(m, e.target.value as DeliveryStatus)} className="py-0.5 text-xs border-gray-300 rounded-md" title={`「${m.trigger}」で請求書の下書きを起票`}>
                        {DELIVERY_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : <Badge tone={DELIVERY_TONE[m.deliveryStatus]}>{m.deliveryStatus}</Badge>}
                  </td>
                  <td className={td}>
                    {canWrite ? (
                      <select value={m.invoiceStatus} onChange={e => changeInvoice(m, e.target.value as MilestoneInvoiceStatus)} className="py-0.5 text-xs border-gray-300 rounded-md">
                        {INVOICE_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : <Badge tone={INVOICE_TONE[m.invoiceStatus]}>{m.invoiceStatus}</Badge>}
                  </td>
                  <td className={`${td} font-mono text-xs whitespace-nowrap`}>{m.invoiceNumber || '—'}</td>
                  <td className={`${td} whitespace-nowrap`}>{m.issueDate || '—'}</td>
                  <td className={`${td} whitespace-nowrap ${summary.overdue.includes(m) ? 'text-red-700 font-semibold' : ''}`}>{m.dueDate || '—'}</td>
                  <td className={`${td} whitespace-nowrap`}>{m.paidDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editor.editing && (
          <div className="px-4 py-3">
            <button type="button" onClick={() => editor.setDraft([...d, { id: newId(), name: '', deliverable: '', amount: 0, plannedDate: '', deliveryStatus: '未着手', trigger: '検収完了', invoiceStatus: '未起票' }])} className={btnSecondary}>フェーズを追加</button>
          </div>
        )}
        {!editor.editing && (
          <p className="px-4 py-2 text-xs border-t text-earth-500 border-white/40">
            納品ステータスが各フェーズの起票トリガー (納品完了/検収完了) に達すると、そのフェーズの請求書を下書きとして自動起票します (入金予定日は翌月末)。「発行済」にすると請求書番号を採番します。
          </p>
        )}
      </Panel>
    </div>
  );
};

export default BillingTab;
