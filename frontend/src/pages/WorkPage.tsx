import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAppOutletContext, useModal } from '../contexts';
import { useWorks } from '../hooks/useWorks';
import { createWork } from '../features/works/workApi';
import { billingSummary, daysUntil } from '../features/works/workMetrics';
import { Badge } from '../features/works/parts';
import { yen } from '../features/works/ui';
import type { Work } from '../types';

// 次に来る重要期日
const nextKeyDate = (work: Work, today: Date) => work.keyDates
  .map(k => ({ ...k, days: daysUntil(k.date, today) }))
  .filter((k): k is typeof k & { days: number } => k.days !== null && k.days >= 0)
  .sort((a, b) => a.days - b.days)[0];

const WorkPage = () => {
  const { setHeaderProps, permissions } = useAppOutletContext();
  const { showModal } = useModal();
  const navigate = useNavigate();
  const canWrite = permissions?.isAdmin === true || permissions?.permissions?.projects === 'write';
  const { works, loading } = useWorks();
  const [newTitle, setNewTitle] = useState<string | null>(null);
  const today = new Date();

  useEffect(() => {
    setHeaderProps({
      title: '作品別収支',
      actions: canWrite ? (
        <button onClick={() => setNewTitle('')} className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-md bg-earth-600 hover:bg-earth-700">作品を追加</button>
      ) : undefined,
    });
  }, [setHeaderProps, canWrite]);

  const create = async () => {
    const title = (newTitle ?? '').trim();
    if (!title) return;
    try {
      const id = await createWork(title);
      setNewTitle(null);
      navigate(`/works/${id}`);
    } catch (error) {
      console.error('作品の作成に失敗しました:', error);
      showModal({ title: 'エラー', message: '作品の作成に失敗しました。' });
    }
  };

  if (loading) return <div className="p-10 text-center">作品を読み込み中...</div>;

  return (
    <div className="w-full min-h-full pb-10">
      {newTitle !== null && (
        <form onSubmit={e => { e.preventDefault(); create(); }} className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-white/60 border-white/40">
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="作品名 (例: ○○○ 第1期)" className="flex-1 min-w-[14rem] px-3 py-1.5 text-sm border-gray-300 rounded-md" />
          <button type="button" onClick={() => setNewTitle(null)} className="px-3 py-1.5 text-sm bg-white border rounded-md">キャンセル</button>
          <button type="submit" disabled={!newTitle.trim()} className="px-4 py-1.5 text-sm text-white rounded-md bg-earth-600 hover:bg-earth-700 disabled:opacity-40">作成</button>
        </form>
      )}
      <ul className="divide-y bg-white/40 backdrop-blur-sm divide-white/40">
        {works.length === 0 && <li className="py-12 text-sm text-center text-earth-500">作品が登録されていません。{canWrite && '右上の「作品を追加」から登録してください。'}</li>}
        {works.map(work => {
          const billing = billingSummary(work, today);
          const next = nextKeyDate(work, today);
          const paidRate = billing.contractTotal > 0 ? billing.paid / billing.contractTotal : 0;
          const invoicedRate = billing.contractTotal > 0 ? billing.invoiced / billing.contractTotal : 0;
          return (
            <li key={work.id}>
              <Link to={`/works/${work.id}`} className="grid items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6 hover:bg-white/40 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.2fr)_auto]">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium truncate text-earth-900">{work.title}<Badge tone="earth">{work.status}</Badge></p>
                  <p className="text-xs truncate text-earth-600">{[work.client, work.originalWork && `原作: ${work.originalWork}`].filter(Boolean).join(' ・ ') || '—'}</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-earth-600 tabular-nums"><span>契約 {yen(billing.contractTotal)}</span><span>未請求 {yen(billing.unbilled)}</span></div>
                  <div className="relative h-2 mt-1 overflow-hidden rounded-full bg-earth-100">
                    <div className="absolute inset-y-0 left-0 bg-sky-400" style={{ width: `${Math.min(100, invoicedRate * 100)}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-[#8B9A8B]" style={{ width: `${Math.min(100, paidRate * 100)}%` }} />
                  </div>
                </div>
                <div className="text-xs text-earth-600">
                  {next ? <>{next.label} <span className="font-semibold text-earth-900">あと{next.days}日</span></> : '予定された期日なし'}
                  {billing.overdue.length > 0 && <span className="block text-red-700">入金遅延 {billing.overdue.length}件</span>}
                </div>
                <ChevronRight size={18} className="hidden md:block text-earth-400" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WorkPage;
