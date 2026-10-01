import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useProjects } from '../../hooks/useProjectData';
import { useVendors } from '../../hooks/useMasters';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { formatYen } from '../../utils/money';
import type { Period } from '../../utils/period';
import { buildBusinessMetrics, type GroupMetric } from './businessMetrics';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const yen = (v: number) => `¥${formatYen(v)}`;
const rate = (margin: number, sales: number) => (sales > 0 ? `${(margin / sales * 100).toFixed(1)}%` : '—');

const Card = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`p-4 sm:p-6 bg-white/50 backdrop-blur-sm ${className}`}>
    <h3 className="mb-3 text-lg font-semibold text-earth-800">{title}</h3>
    {children}
  </div>
);

const Kpi = ({ title, value, sub }: { title: string; value: string; sub?: string }) => (
  <div className="p-5 bg-white/50 backdrop-blur-sm">
    <h3 className="text-xs font-semibold tracking-wider text-earth-500">{title}</h3>
    <p className="mt-2 text-2xl font-bold tabular-nums text-earth-900">{value}</p>
    {sub && <p className="mt-1 text-xs text-earth-400">{sub}</p>}
  </div>
);

const MetricTable = ({ rows, showPayout = false, emptyText }: { rows: GroupMetric[]; showPayout?: boolean; emptyText: string }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead className="text-xs text-left text-earth-500">
        <tr>
          <th className="py-2 pr-3">名前</th>
          <th className="py-2 pr-3 text-right">件数</th>
          {showPayout && <th className="py-2 pr-3 text-right">配分額</th>}
          <th className="py-2 pr-3 text-right">売上 (税抜)</th>
          <th className="py-2 pr-3 text-right">MARGIN</th>
          <th className="py-2 text-right">利益率</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/50">
        {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-earth-500">{emptyText}</td></tr>}
        {rows.map(row => (
          <tr key={row.key} className="tabular-nums">
            <td className="py-2 pr-3 whitespace-nowrap">{row.linkTo ? <Link to={row.linkTo} className="hover:underline">{row.label}</Link> : row.label}</td>
            <td className="py-2 pr-3 text-right">{row.count}</td>
            {showPayout && <td className="py-2 pr-3 text-right">{yen(row.payout ?? 0)}</td>}
            <td className="py-2 pr-3 text-right">{yen(row.sales)}</td>
            <td className="py-2 pr-3 text-right">{yen(row.margin)}</td>
            <td className="py-2 text-right">{rate(row.margin, row.sales)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** 経営分析: 担当者別・作業者別の売上と利益、見込み、入金予定、マスター予算の消化状況 */
const BusinessAnalysis = ({ period }: { period: Period }) => {
  const { projects, loading } = useProjects();
  const { vendorIndex } = useVendors();
  const { settings } = useCompanySettings();
  const m = useMemo(() => buildBusinessMetrics(projects, period, settings.taxRate, vendorIndex), [projects, period, settings.taxRate, vendorIndex]);

  if (loading) return <div className="p-10 text-center">分析中...</div>;

  const receivableTotal = m.receivables.reduce((s, r) => s + r.total, 0);

  return (
    <div className="flex flex-col gap-px bg-earth-200/60">
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="売上の見込み (進行中)" value={yen(m.pipeline.sales)} sub={`${m.pipeline.count}件・税抜・現時点`} />
        <Kpi title="完了・請求未確定" value={yen(m.uninvoiced.sales)} sub={`${m.uninvoiced.count}件 (請求書の FIX 待ち)`} />
        <Kpi title="入金予定 (請求確定済み)" value={yen(receivableTotal)} sub="お支払期限が今日以降・税込" />
        <Kpi title="お支払期限を過ぎた請求" value={yen(m.overdueTotal)} sub="入金状況は管理していないため参考値" />
      </div>

      <div className="grid grid-cols-1 gap-px lg:grid-cols-2">
        <Card title="入金予定 (お支払期限の月別)">
          {m.receivables.length === 0 ? <p className="text-sm text-earth-500">入金予定はありません。</p> : (
            <div className="h-64">
              <Bar
                data={{ labels: m.receivables.map(r => `${r.month.slice(0, 4)}年${Number(r.month.slice(5))}月`), datasets: [{ label: '入金予定額 (税込)', data: m.receivables.map(r => Math.round(r.total)), backgroundColor: '#5F7D8E', borderRadius: 4 }] }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
          )}
        </Card>
        <Card title="版権担当者別の売上と利益 (期間内)">
          <MetricTable rows={m.byManager} emptyText="期間内の案件はありません。" />
        </Card>
      </div>

      <Card title="作業者別の配分額・売上・利益 (期間内)">
        <p className="mb-2 text-xs text-earth-500">売上・MARGIN は、複数人で担当した案件を配分額の比率で按分しています。外注先マスタに未登録の名前は「(未登録)」と表示します。</p>
        <MetricTable rows={m.byWorker} showPayout emptyText="期間内の案件はありません。" />
      </Card>

      <Card title="マスタープロジェクトの予算と実績">
        <p className="mb-2 text-xs text-earth-500">配分済み = 子プロジェクトの捻出額の合計、実績 = そのうち完了・請求済の合計。</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-left text-earth-500">
              <tr><th className="py-2 pr-3">マスター</th><th className="py-2 pr-3 text-right">予算</th><th className="py-2 pr-3 text-right">配分済み</th><th className="py-2 pr-3 text-right">実績</th><th className="py-2 pr-3 text-right">残額</th><th className="py-2 w-48">消化率</th></tr>
            </thead>
            <tbody className="divide-y divide-white/50">
              {m.masters.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-earth-500">マスタープロジェクトはありません。</td></tr>}
              {m.masters.map(row => {
                const used = row.budget > 0 ? row.allocated / row.budget * 100 : 0;
                const done = row.budget > 0 ? row.actual / row.budget * 100 : 0;
                return (
                  <tr key={row.master.id} className="tabular-nums">
                    <td className="py-2 pr-3"><Link to={`/projects/${row.master.id}`} className="hover:underline">{row.master.title}</Link><span className="ml-1 text-xs text-earth-500">({row.subCount}件)</span></td>
                    <td className="py-2 pr-3 text-right">{yen(row.budget)}</td>
                    <td className="py-2 pr-3 text-right">{yen(row.allocated)}</td>
                    <td className="py-2 pr-3 text-right">{yen(row.actual)}</td>
                    <td className={`py-2 pr-3 text-right ${row.remaining < 0 ? 'text-red-600 font-semibold' : ''}`}>{yen(row.remaining)}</td>
                    <td className="py-2">
                      <div className="relative h-3 overflow-hidden rounded-full bg-white/60" title={`配分済み ${used.toFixed(1)}% / 実績 ${done.toFixed(1)}%`}>
                        <div className="absolute inset-y-0 left-0 bg-earth-300" style={{ width: `${Math.min(used, 100)}%` }} />
                        <div className="absolute inset-y-0 left-0 bg-earth-600" style={{ width: `${Math.min(done, 100)}%` }} />
                      </div>
                      <p className="mt-0.5 text-[10px] text-earth-500">配分 {used.toFixed(0)}% / 実績 {done.toFixed(0)}%</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default BusinessAnalysis;
