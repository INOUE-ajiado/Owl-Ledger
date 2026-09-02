import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { Project } from '../../types';
import { Chart, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, BarController, LineController } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, BarController, LineController);

const formatCurrency = (value: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const GoalProgressBar = ({ value, goal }: { value: number, goal: number }) => {
  const percentage = goal > 0 ? (value / goal) * 100 : 0;
  const displayPercentage = Math.min(percentage, 100);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-base font-medium text-earth-700">月間目標達成率</span>
        <span className="text-sm font-semibold">{formatPercent(percentage)}</span>
      </div>
      <div className="w-full h-4 bg-white/30 rounded-full border border-white/20">
        <div className="h-4 bg-earth-500 rounded-full shadow-inner" style={{ width: `${displayPercentage}%` }}></div>
      </div>
      <div className="mt-1 text-xs text-right text-earth-500">
        目標: {formatCurrency(goal)}
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, subValue }: { title: string, value: string, subValue?: string }) => (
  <div className="p-5 glass-panel">
    <h3 className="text-xs font-semibold tracking-wider text-earth-500 uppercase">{title}</h3>
    <p className="mt-2 text-3xl font-bold text-earth-900">{value}</p>
    {subValue && <p className="mt-1 text-xs text-earth-400">{subValue}</p>}
  </div>
);


const ProjectAnalysis = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const MONTHLY_SALES_GOAL = 5000000;

  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, "projects"));
      const projectsData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Project))
        .filter(p => p.status !== '削除済み');
      setProjects(projectsData);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const analysisData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthlySales: Record<string, number> = {};
    const monthlyMarginRates: Record<string, { total: number; count: number }> = {};
    const clientSales: Record<string, number> = {};
    const categorySales: Record<string, number> = {};

    // ★ 修正点: totalGloss を削除
    let totalMarginRate = 0;

    projects.forEach(project => {
      const registrationDate = new Date(project.registrationDate);
      if (isNaN(registrationDate.getTime())) return;

      const year = registrationDate.getFullYear();
      const monthKey = `${year}-${String(registrationDate.getMonth() + 1).padStart(2, '0')}`;
      const gloss = project.gloss || 0;

      if (year === currentYear || year === lastYear) {
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + gloss;
      }

      if (year === currentYear) {
        if (!monthlyMarginRates[monthKey]) monthlyMarginRates[monthKey] = { total: 0, count: 0 };
        monthlyMarginRates[monthKey].total += project.marginRate;
        monthlyMarginRates[monthKey].count += 1;
      }

      clientSales[project.clientName] = (clientSales[project.clientName] || 0) + gloss;
      categorySales[project.category] = (categorySales[project.category] || 0) + gloss;

      // ★ 修正点: totalGloss += gloss; を削除
      totalMarginRate += project.marginRate;
    });

    const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

    const salesChartData = {
      labels,
      datasets: [
        { type: 'bar' as const, label: `${currentYear}年 売上`, data: labels.map((_, i) => monthlySales[`${currentYear}-${String(i + 1).padStart(2, '0')}`] || 0), backgroundColor: '#C89F65', borderRadius: 4 },
        { type: 'line' as const, label: `${lastYear}年 売上`, data: labels.map((_, i) => monthlySales[`${lastYear}-${String(i + 1).padStart(2, '0')}`] || 0), borderColor: '#8B9A8B', fill: false, tension: 0.3 },
      ],
    };

    const marginRateChartData = {
      labels,
      datasets: [{
        label: `${currentYear}年 平均利益率 (%)`, data: labels.map((_, i) => {
          const key = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
          return monthlyMarginRates[key] ? monthlyMarginRates[key].total / monthlyMarginRates[key].count : 0;
        }), borderColor: '#5F7D8E', backgroundColor: 'rgba(95, 125, 142, 0.1)', fill: true, tension: 0.4
      }],
    };

    const topClients = Object.entries(clientSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const categoryChartData = {
      labels: Object.keys(categorySales),
      datasets: [{
        data: Object.values(categorySales),
        backgroundColor: ['#BF6A5D', '#8B9A8B', '#C89F65', '#5F7D8E', '#6B705C', '#A78C7C', '#D9C5B2', '#9A8B9A'],
        borderWidth: 0,
      }],
    };

    return {
      currentMonthSales: monthlySales[currentMonthKey] || 0,
      averageMarginRate: projects.length > 0 ? totalMarginRate / projects.length : 0,
      salesChartData,
      marginRateChartData,
      topClients,
      categoryChartData,
    };
  }, [projects]);


  if (loading) return <div className="p-10 text-center">売上データを分析中...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <GoalProgressBar value={analysisData.currentMonthSales} goal={MONTHLY_SALES_GOAL} />
        </div>
        <KpiCard title="当月売上高" value={formatCurrency(analysisData.currentMonthSales)} />
        <KpiCard title="全体平均利益率" value={formatPercent(analysisData.averageMarginRate)} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="p-6 glass-panel">
          <h3 className="mb-4 text-lg font-semibold text-earth-800">売上 前年比較</h3>
          <div className="h-80"><Chart type='bar' data={analysisData.salesChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        </div>
        <div className="p-6 glass-panel">
          <h3 className="mb-4 text-lg font-semibold text-earth-800">利益率 推移（{new Date().getFullYear()}年）</h3>
          <div className="h-80"><Line data={analysisData.marginRateChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="p-6 glass-panel lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-earth-800">クライアント別 売上ランキング (TOP5)</h3>
          <ul className="space-y-3">
            {analysisData.topClients.map(([name, sales], index) => (
              <li key={name} className="flex items-center justify-between text-sm px-2 py-1 rounded transition-colors hover:bg-white/20">
                <span className="font-medium text-earth-800">{index + 1}. {name}</span>
                <span className="font-bold text-earth-600">{formatCurrency(sales)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 glass-panel lg:col-span-3">
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