import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Chart, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, BarController, LineController } from 'chart.js';
import { useProjects } from '../../hooks/useProjectData';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { projectFinancials } from '../../utils/money';
import { inPeriod, monthsInPeriod, type Period } from '../../utils/period';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, BarController, LineController);

const formatCurrency = (value: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const shiftYear = (month: string, years: number) => `${Number(month.slice(0, 4)) + years}${month.slice(4)}`;

const GoalProgressBar = ({ value, goal }: { value: number, goal: number }) => {
  const percentage = goal > 0 ? (value / goal) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-base font-medium text-earth-700">売上目標達成率</span>
        <span className="text-sm font-semibold">{goal > 0 ? formatPercent(percentage) : '—'}</span>
      </div>
      <div className="w-full h-4 border rounded-full bg-white/30 border-white/20">
        <div className="h-4 rounded-full shadow-inner bg-earth-500" style={{ width: `${Math.min(percentage, 100)}%` }}></div>
      </div>
      <div className="mt-1 text-xs text-right text-earth-500">
        {goal > 0 ? `目標: ${formatCurrency(goal)} (月間目標 × 月数)` : '月間売上目標は「会社設定」で設定できます'}
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, subValue }: { title: string, value: string, subValue?: string }) => (
  <div className="p-5 bg-white/50 backdrop-blur-sm">
    <h3 className="text-xs font-semibold tracking-wider uppercase text-earth-500">{title}</h3>
    <p className="mt-2 text-2xl font-bold sm:text-3xl text-earth-900">{value}</p>
    {subValue && <p className="mt-1 text-xs text-earth-400">{subValue}</p>}
  </div>
);

/** 売上分析 (期間内の売上・MARGIN・前年同月比較・クライアント別・カテゴリ別) */
const ProjectAnalysis = ({ period }: { period: Period }) => {
  const { projects, loading } = useProjects();
  const { settings } = useCompanySettings();

  const analysisData = useMemo(() => {
    // マスターは予算枠なので売上に含めない (子プロジェクトで計上)
    const all = projects.filter(p => p.projectType !== 'master').map(p => ({ p, fin: projectFinancials(p, settings.taxRate) }));
    const target = all.filter(({ p }) => inPeriod(p.registrationDate, period));
    const months = monthsInPeriod(period, all.map(({ p }) => p.registrationDate));

    const monthly: Record<string, { sales: number; margin: number }> = {};
    all.forEach(({ p, fin }) => {
      const key = (p.registrationDate || '').slice(0, 7);
      monthly[key] ??= { sales: 0, margin: 0 };
      monthly[key].sales += fin.glossExclusive;
      monthly[key].margin += fin.finalMargin;
    });

    const clientSales: Record<string, { name: string; sales: number }> = {};
    const categorySales: Record<string, number> = {};
    target.forEach(({ p, fin }) => {
      const key = p.clientId || p.clientName;
      clientSales[key] ??= { name: p.clientName, sales: 0 };
      clientSales[key].sales += fin.glossExclusive;
      categorySales[p.category || '未分類'] = (categorySales[p.category || '未分類'] || 0) + fin.glossExclusive;
    });

    const totalSales = target.reduce((s, { fin }) => s + fin.glossExclusive, 0);
    const totalMargin = target.reduce((s, { fin }) => s + fin.finalMargin, 0);
    const labels = months.map(m => `${Number(m.slice(2, 4))}/${Number(m.slice(5))}`);

    return {
      totalSales,
      totalMargin,
      count: target.length,
      goal: settings.monthlySalesGoal * months.length,
      salesChartData: {
        labels,
        datasets: [
          { type: 'bar' as const, label: '売上 (税抜)', data: months.map(m => monthly[m]?.sales || 0), backgroundColor: '#C89F65', borderRadius: 4 },
          { type: 'line' as const, label: '前年同月', data: months.map(m => monthly[shiftYear(m, -1)]?.sales || 0), borderColor: '#8B9A8B', fill: false, tension: 0.3 },
        ],
      },
      marginRateChartData: {
        labels,
        datasets: [{
          label: 'MARGIN率 (%)',
          data: months.map(m => monthly[m]?.sales ? (monthly[m].margin / monthly[m].sales) * 100 : 0),
          borderColor: '#5F7D8E', backgroundColor: 'rgba(95, 125, 142, 0.1)', fill: true, tension: 0.4,
        }],
      },
      topClients: Object.entries(clientSales).sort((a, b) => b[1].sales - a[1].sales).slice(0, 5),
      categoryChartData: {
        labels: Object.keys(categorySales),
        datasets: [{
          data: Object.values(categorySales),
          backgroundColor: ['#BF6A5D', '#8B9A8B', '#C89F65', '#5F7D8E', '#6B705C', '#A78C7C', '#D9C5B2', '#9A8B9A'],
          borderWidth: 0,
        }],
      },
    };
  }, [projects, period, settings.taxRate, settings.monthlySalesGoal]);

  if (loading) return <div className="p-10 text-center">売上データを分析中...</div>;

  return (
    <div className="flex flex-col gap-px bg-earth-200/60">
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 bg-white/50 backdrop-blur-sm">
          <GoalProgressBar value={analysisData.totalSales} goal={analysisData.goal} />
        </div>
        <KpiCard title="期間の売上 (税抜)" value={formatCurrency(analysisData.totalSales)} subValue={`${analysisData.count}件`} />
        <KpiCard title="期間の MARGIN" value={formatCurrency(analysisData.totalMargin)} />
        <KpiCard title="利益率" value={analysisData.totalSales > 0 ? formatPercent(analysisData.totalMargin / analysisData.totalSales * 100) : '—'} subValue="MARGIN ÷ 売上 (税抜)" />
      </div>

      <div className="grid grid-cols-1 gap-px lg:grid-cols-2">
        <div className="p-4 sm:p-6 bg-white/50 backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-semibold text-earth-800">月別売上と前年同月</h3>
          <div className="h-80"><Chart type='bar' data={analysisData.salesChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        </div>
        <div className="p-4 sm:p-6 bg-white/50 backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-semibold text-earth-800">利益率の推移</h3>
          <div className="h-80"><Line data={analysisData.marginRateChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px lg:grid-cols-5">
        <div className="p-4 sm:p-6 bg-white/50 backdrop-blur-sm lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-earth-800">クライアント別 売上ランキング (TOP5)</h3>
          <ul className="space-y-3">
            {analysisData.topClients.length === 0 && <li className="text-sm text-earth-500">期間内の売上はありません。</li>}
            {analysisData.topClients.map(([id, { name, sales }], index) => (
              <li key={id} className="flex items-center justify-between px-2 py-1 text-sm transition-colors rounded hover:bg-white/20">
                <Link to={`/clients/${id}`} className="font-medium text-earth-800 hover:underline">{index + 1}. {name}</Link>
                <span className="font-bold text-earth-600">{formatCurrency(sales)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 sm:p-6 bg-white/50 backdrop-blur-sm lg:col-span-3">
          <h3 className="mb-4 text-lg font-semibold text-earth-800">案件カテゴリ別 売上構成</h3>
          <div className="flex justify-center h-80">
            <Pie data={analysisData.categoryChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectAnalysis;
