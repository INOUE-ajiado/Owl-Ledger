import { ExternalLink } from 'lucide-react';
import { InfoRow, Panel } from '../../components/DetailParts';
import type { Work } from '../../types';
import { daysUntil, newId } from './workMetrics';
import { Badge, EditActions, NumberInput } from './parts';
import { btnSecondary, inputClass, removeAt, replaceAt, td, useEditable, yen } from './ui';

interface TabProps {
  work: Work;
  canWrite: boolean;
  onSave: (patch: Partial<Omit<Work, 'id'>>) => Promise<void>;
}

const WORK_STATUSES: Work['status'][] = ['企画', '制作中', '放送・配信中', '完了'];

type Summary = Pick<Work, 'title' | 'status' | 'client' | 'contractTotal' | 'openingBalance' | 'originalWork' | 'publisher' | 'ownShare' | 'committee' | 'remarks'>;

const pickSummary = (w: Work): Summary => ({
  title: w.title, status: w.status, client: w.client, contractTotal: w.contractTotal, openingBalance: w.openingBalance,
  originalWork: w.originalWork, publisher: w.publisher, ownShare: w.ownShare, committee: w.committee, remarks: w.remarks ?? '',
});

const RightsPanel = ({ work, canWrite, onSave }: TabProps) => {
  const editor = useEditable(pickSummary(work), d => onSave({ ...d, title: d.title.trim() || work.title }));
  const d = editor.draft;
  const set = (patch: Partial<Summary>) => editor.setDraft({ ...d, ...patch });
  const ratioTotal = d.committee.reduce((s, m) => s + (m.ratio || 0), 0);

  return (
    <Panel title="権利・座組みサマリー" actions={<EditActions editor={editor} canWrite={canWrite} />}>
      {editor.editing ? (
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <label className="text-xs sm:col-span-2">作品名<input value={d.title} onChange={e => set({ title: e.target.value })} className={inputClass} /></label>
          <label className="text-xs">ステータス
            <select value={d.status} onChange={e => set({ status: e.target.value as Work['status'] })} className={inputClass}>
              {WORK_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs">発注元 (幹事会社など)<input value={d.client} onChange={e => set({ client: e.target.value })} className={inputClass} /></label>
          <label className="text-xs">制作受託 契約総額 (税抜)<NumberInput value={d.contractTotal} onChange={v => set({ contractTotal: v })} /></label>
          <label className="text-xs">作品に充てる手元資金<NumberInput value={d.openingBalance} onChange={v => set({ openingBalance: v })} /></label>
          <label className="text-xs">原作<input value={d.originalWork} onChange={e => set({ originalWork: e.target.value })} className={inputClass} /></label>
          <label className="text-xs">出版社<input value={d.publisher} onChange={e => set({ publisher: e.target.value })} className={inputClass} /></label>
          <label className="text-xs">自社持ち分 (権利比率 %)<NumberInput value={d.ownShare} onChange={v => set({ ownShare: v })} /></label>
          <div className="sm:col-span-2">
            <p className="mb-1 text-xs">製作委員会メンバー・出資比率 <span className={`ml-2 tabular-nums ${ratioTotal === 100 || d.committee.length === 0 ? 'text-earth-500' : 'text-red-600'}`}>合計 {ratioTotal}%</span></p>
            <div className="space-y-2">
              {d.committee.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={m.name} onChange={e => set({ committee: replaceAt(d.committee, i, { name: e.target.value }) })} placeholder="社名" className={inputClass} />
                  <NumberInput value={m.ratio} onChange={v => set({ committee: replaceAt(d.committee, i, { ratio: v }) })} className="w-24" />
                  <span className="text-xs">%</span>
                  <button type="button" onClick={() => set({ committee: removeAt(d.committee, i) })} className="px-2 text-red-500" aria-label="削除">×</button>
                </div>
              ))}
              <button type="button" onClick={() => set({ committee: [...d.committee, { name: '', ratio: 0 }] })} className={btnSecondary}>メンバーを追加</button>
            </div>
          </div>
          <label className="text-xs sm:col-span-2">備考<textarea value={d.remarks} onChange={e => set({ remarks: e.target.value })} rows={2} className={inputClass} /></label>
        </div>
      ) : (
        <dl className="divide-y divide-white/40">
          <InfoRow label="ステータス" value={<Badge tone="earth">{work.status}</Badge>} />
          <InfoRow label="発注元" value={work.client} />
          <InfoRow label="契約総額 (税抜)" value={yen(work.contractTotal)} />
          <InfoRow label="原作" value={work.originalWork} />
          <InfoRow label="出版社" value={work.publisher} />
          <InfoRow label="製作委員会" value={work.committee.length > 0 && (
            <ul className="space-y-1">
              {work.committee.map((m, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex-1">{m.name || '(未入力)'}</span>
                  <span className="w-12 text-right tabular-nums">{m.ratio}%</span>
                  <span className="w-20 h-1.5 overflow-hidden rounded-full bg-earth-100"><span className="block h-full bg-earth-500" style={{ width: `${Math.min(100, m.ratio)}%` }} /></span>
                </li>
              ))}
            </ul>
          )} />
          <InfoRow label="自社持ち分" value={`${work.ownShare}%`} />
          <InfoRow label="手元資金" value={yen(work.openingBalance)} />
          <InfoRow label="備考" value={work.remarks && <span className="whitespace-pre-wrap">{work.remarks}</span>} />
        </dl>
      )}
    </Panel>
  );
};

const countdownTone = (days: number | null) => (days === null ? 'gray' : days < 0 ? 'gray' : days <= 14 ? 'red' : days <= 60 ? 'yellow' : 'blue');

const KeyDatesPanel = ({ work, canWrite, onSave }: TabProps) => {
  const editor = useEditable(work.keyDates, keyDates => onSave({ keyDates: keyDates.filter(k => k.label.trim()) }));
  const today = new Date();
  return (
    <Panel title="重要期日カウントダウン" actions={<EditActions editor={editor} canWrite={canWrite} />}>
      {editor.editing ? (
        <div className="p-4 space-y-2">
          {editor.draft.map((k, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={k.label} onChange={e => editor.setDraft(replaceAt(editor.draft, i, { label: e.target.value }))} className={inputClass} placeholder="期日の名前" />
              <input type="date" value={k.date} onChange={e => editor.setDraft(replaceAt(editor.draft, i, { date: e.target.value }))} className={`${inputClass} w-40`} />
              <button type="button" onClick={() => editor.setDraft(removeAt(editor.draft, i))} className="px-2 text-red-500" aria-label="削除">×</button>
            </div>
          ))}
          <button type="button" onClick={() => editor.setDraft([...editor.draft, { label: '', date: '' }])} className={btnSecondary}>期日を追加</button>
        </div>
      ) : (
        <ul className="divide-y divide-white/40">
          {work.keyDates.length === 0 && <li className="px-4 py-6 text-sm text-center text-earth-500">期日が登録されていません。</li>}
          {[...work.keyDates].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).map((k, i) => {
            const days = daysUntil(k.date, today);
            return (
              <li key={i} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="text-earth-800">{k.label}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-earth-600">{k.date || '未定'}</span>
                  <span className="w-20 text-right">
                    <Badge tone={countdownTone(days)}>{days === null ? '—' : days === 0 ? '本日' : days > 0 ? `あと${days}日` : `${-days}日経過`}</Badge>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};

const ContractsPanel = ({ work, canWrite, onSave }: TabProps) => {
  const editor = useEditable(work.contracts, contracts => onSave({ contracts: contracts.filter(c => c.name.trim()) }));
  return (
    <Panel title="契約書ファイルリンク" actions={<EditActions editor={editor} canWrite={canWrite} />}>
      {editor.editing ? (
        <div className="p-4 space-y-3">
          {editor.draft.map((c, i) => (
            <div key={c.id} className="grid grid-cols-1 gap-2 p-2 rounded-md sm:grid-cols-[1fr_2fr_auto_auto_auto] bg-earth-50">
              <input value={c.name} onChange={e => editor.setDraft(replaceAt(editor.draft, i, { name: e.target.value }))} placeholder="契約書名" className={inputClass} />
              <input value={c.url} onChange={e => editor.setDraft(replaceAt(editor.draft, i, { url: e.target.value }))} placeholder="https://drive.google.com/..." className={inputClass} />
              <label className="text-xs">締結日<input type="date" value={c.signedDate ?? ''} onChange={e => editor.setDraft(replaceAt(editor.draft, i, { signedDate: e.target.value }))} className={inputClass} /></label>
              <label className="text-xs">更新日<input type="date" value={c.renewalDate ?? ''} onChange={e => editor.setDraft(replaceAt(editor.draft, i, { renewalDate: e.target.value }))} className={inputClass} /></label>
              <button type="button" onClick={() => editor.setDraft(removeAt(editor.draft, i))} className="px-2 text-red-500 self-end" aria-label="削除">×</button>
            </div>
          ))}
          <button type="button" onClick={() => editor.setDraft([...editor.draft, { id: newId(), name: '', url: '' }])} className={btnSecondary}>契約書を追加</button>
        </div>
      ) : (
        <table className="min-w-full text-sm">
          <tbody className="divide-y divide-white/40">
            {work.contracts.map(c => (
              <tr key={c.id}>
                <td className={td}>
                  {/^https?:\/\//.test(c.url)
                    ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">{c.name}<ExternalLink size={13} /></a>
                    : <span className="text-earth-800">{c.name} <span className="text-xs text-earth-400">(リンク未登録)</span></span>}
                </td>
                <td className={`${td} text-xs text-right text-earth-500 tabular-nums whitespace-nowrap`}>
                  {c.signedDate && `締結 ${c.signedDate}`}{c.renewalDate && ` / 更新 ${c.renewalDate}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
};

/** 契約・権利基本情報 (マスター台帳) */
const OverviewTab = (props: TabProps) => (
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <RightsPanel {...props} />
    <div className="space-y-4">
      <KeyDatesPanel {...props} />
      <ContractsPanel {...props} />
    </div>
  </div>
);

export type { TabProps };
export default OverviewTab;
