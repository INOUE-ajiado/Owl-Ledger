import { useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAppOutletContext, useModal } from '../contexts';
import { useWork, useWorkCosts } from '../hooks/useWorks';
import { useCollection } from '../hooks/useCollection';
import { StatCard } from '../components/DetailParts';
import { deleteWork, saveWork } from '../features/works/workApi';
import { billingSummary, cashFlow, categoryBreakdown, costItemsFromCosts, costItemsFromLedger, episodeBreakdown, licenseSummary } from '../features/works/workMetrics';
import { yen } from '../features/works/ui';
import OverviewTab from '../features/works/OverviewTab';
import BillingTab from '../features/works/BillingTab';
import CostTab from '../features/works/CostTab';
import LicenseTab from '../features/works/LicenseTab';
import CashTab from '../features/works/CashTab';
import type { LedgerReport, Work } from '../types';

const TABS = [
  { id: 'billing', label: '資金回収・マイルストーン' },
  { id: 'cost', label: '原価予実' },
  { id: 'license', label: 'ライセンス・二次利用' },
  { id: 'cash', label: 'キャッシュギャップ' },
  { id: 'overview', label: '契約・権利' },
] as const;

type TabId = typeof TABS[number]['id'];

const WorkDetailPage = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const { setHeaderProps, permissions } = useAppOutletContext();
  const { showModal } = useModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabId = TABS.some(t => t.id === tabParam) ? tabParam as TabId : 'billing';

  const canWrite = permissions?.isAdmin === true || permissions?.permissions?.projects === 'write';
  const canReadLedger = !!permissions?.permissions?.ledger && permissions.permissions.ledger !== 'disabled';
  const { work, loading } = useWork(workId);
  const { costs } = useWorkCosts(workId);
  const { items: reports } = useCollection<LedgerReport>('ledgerReports', canReadLedger);

  const ledgerItems = useMemo(() => (workId ? costItemsFromLedger(reports, workId) : []), [reports, workId]);
  const items = useMemo(() => [...costItemsFromCosts(costs), ...ledgerItems], [costs, ledgerItems]);
  const flow = useMemo(() => (work ? cashFlow(work, items) : { months: [], peak: null }), [work, items]);

  useEffect(() => {
    setHeaderProps({ title: work ? work.title : '作品別収支', actions: undefined });
  }, [setHeaderProps, work]);

  const onSave = useCallback(async (patch: Partial<Omit<Work, 'id'>>) => {
    if (!work) return;
    try {
      await saveWork(work, patch);
    } catch (error) {
      console.error('作品の保存に失敗しました:', error);
      showModal({ title: 'エラー', message: '保存に失敗しました。' });
      throw error;
    }
  }, [work, showModal]);

  const handleDelete = () => {
    if (!work) return;
    showModal({
      title: '作品の削除',
      message: `${work.title} を削除しますか？\n請求・ライセンスの記録も消えます (原価明細・出納帳の明細は残ります)。`,
      onCancel: () => {},
      onConfirm: async () => {
        try {
          await deleteWork(work);
          navigate('/works');
        } catch (error) {
          console.error('作品の削除に失敗しました:', error);
          showModal({ title: 'エラー', message: '削除に失敗しました。' });
        }
      },
    });
  };

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;
  if (!work) return <div className="p-10 text-center text-gray-500">作品が見つかりません。<Link to="/works" className="ml-2 underline">一覧へ戻る</Link></div>;

  const billing = billingSummary(work, new Date());
  const budget = categoryBreakdown(work, items);
  const totalBudget = budget.reduce((s, r) => s + r.budget, 0);
  const totalActual = budget.reduce((s, r) => s + r.actual, 0);
  const overEpisodes = episodeBreakdown(work, items).filter(r => r.status === 'over').length;
  const licenseActions = work.licenses.reduce((s, l) => { const x = licenseSummary(l); return s + x.billableReports + (x.supervisionBillable ? 1 : 0); }, 0);
  const shortfall = flow.peak && flow.peak.balance < 0 ? flow.peak : null;
  const alerts: Partial<Record<TabId, number>> = {
    billing: billing.overdue.length, cost: overEpisodes + budget.filter(r => r.status === 'over').length, license: licenseActions, cash: shortfall ? 1 : 0,
  };

  return (
    <div className="w-full min-h-full pb-10 space-y-4 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 sm:px-0 sm:pt-0">
        <Link to="/works" className="inline-flex items-center gap-1 text-sm text-earth-700 hover:underline"><ArrowLeft size={16} />作品一覧</Link>
        {permissions?.isAdmin && <button onClick={handleDelete} className="px-4 py-1.5 text-sm text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50">削除</button>}
      </div>

      <div className="grid grid-cols-2 gap-px lg:grid-cols-4 sm:gap-3">
        <StatCard label="契約総額 (税抜)" value={yen(work.contractTotal)} sub={`未請求 ${yen(billing.unbilled)}`} />
        <StatCard label="入金済 / 請求済" value={yen(billing.paid)} sub={`請求済 ${yen(billing.invoiced)}`} />
        <StatCard label="原価実績 / 予算" value={yen(totalActual)} sub={`予算 ${yen(totalBudget)}${overEpisodes ? ` ・ 超過 ${overEpisodes}話` : ''}`} />
        <StatCard label="資金持ち出しピーク" value={shortfall ? yen(-shortfall.balance) : '—'} sub={shortfall ? `${shortfall.month}` : 'マイナスなし'} />
      </div>

      <div>
        <div className="flex gap-1 px-3 overflow-x-auto border-b sm:px-0 border-white/40" role="tablist">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setSearchParams({ tab: t.id }, { replace: true })}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${tab === t.id ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-600 hover:bg-white/50'}`}>
              {t.label}
              {!!alerts[t.id] && <span className="px-1.5 text-[10px] font-bold leading-4 text-white bg-red-500 rounded-full">{alerts[t.id]}</span>}
            </button>
          ))}
        </div>
        <div className="pt-4">
          {tab === 'overview' && <OverviewTab work={work} canWrite={canWrite} onSave={onSave} />}
          {tab === 'billing' && <BillingTab work={work} canWrite={canWrite} onSave={onSave} />}
          {tab === 'cost' && <CostTab work={work} canWrite={canWrite} onSave={onSave} costs={costs} items={items} ledgerItems={ledgerItems} />}
          {tab === 'license' && <LicenseTab work={work} canWrite={canWrite} onSave={onSave} />}
          {tab === 'cash' && <CashTab flow={flow} openingBalance={work.openingBalance} />}
        </div>
      </div>
    </div>
  );
};

export default WorkDetailPage;
