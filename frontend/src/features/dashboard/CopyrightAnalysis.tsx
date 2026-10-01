import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { Project } from '../../types';
import { useVendors } from '../../hooks/useMasters';
import { inPeriod, monthsInPeriod, type Period } from '../../utils/period';
// ★ 修正点: 不要な 'Chart' を削除しました
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarController,
  LineController,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarController,
  LineController
);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const CopyrightAnalysis = ({ period }: { period: Period }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { vendorIndex } = useVendors();

  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projectsData = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Project))
        .filter((p) => p.status !== '削除済み' && p.projectType !== 'master'); // マスターは集計から除外（子は含める）
      setProjects(projectsData);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const analysisData = useMemo(() => {
    // フィルタリング: 指定された期間のデータのみ
    const targetProjects = projects.filter((p) => inPeriod(p.registrationDate, period));

    // 1. 作品（タイトル）別 集計
    const titleStats: Record<string, { sales: number; count: number }> = {};
    // 2. 月別 単価推移
    const monthlyUnitPrice: Record<string, { totalSales: number; totalChars: number }> = {};
    // 3. クリエイター別 報酬
    const creatorStats: Record<string, { reward: number; count: number }> = {};

    // データの集計処理
    targetProjects.forEach((p) => {
      // 金額の決定（子プロジェクトなら捻出額、通常ならGLOSS）
      const amount = p.projectType === 'sub' ? p.allocatedAmount || 0 : p.gloss;

      // 作品別
      if (!titleStats[p.title]) titleStats[p.title] = { sales: 0, count: 0 };
      titleStats[p.title].sales += amount;
      titleStats[p.title].count += 1;

      // 月別単価 (登録日ベース)
      const monthKey = p.registrationDate.slice(0, 7); // YYYY-MM
      if (!monthlyUnitPrice[monthKey]) monthlyUnitPrice[monthKey] = { totalSales: 0, totalChars: 0 };
      monthlyUnitPrice[monthKey].totalSales += amount;
      monthlyUnitPrice[monthKey].totalChars += p.characterCount || 1; // 0割防止

      // クリエイター別 (外注先マスタで表記ゆれをまとめる)
      p.breakdown.forEach((b) => {
        const name = vendorIndex.resolve(b.name, b.vendorId)?.name ?? b.name;
        if (!creatorStats[name]) creatorStats[name] = { reward: 0, count: 0 };
        creatorStats[name].reward += b.amount;
        creatorStats[name].count += 1; // 担当回数としてカウント（厳密な納品数ではないが目安）
      });
    });

    // チャート用データの生成
    // --- 作品別売上ランキング (Top 10) ---
    const sortedTitles = Object.entries(titleStats)
      .sort((a, b) => b[1].sales - a[1].sales)
      .slice(0, 10);

    const titleChartData = {
      labels: sortedTitles.map(([title]) => title.length > 10 ? title.slice(0, 10) + '...' : title),
      datasets: [
        {
          label: '売上高',
          data: sortedTitles.map(([, data]) => data.sales),
          backgroundColor: '#C89F65',
          borderColor: '#C89F65',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };

    // --- 平均単価 推移 (月次) ---
    const months = monthsInPeriod(period, targetProjects.map(p => p.registrationDate));

    const unitPriceData = months.map(m => {
      const data = monthlyUnitPrice[m];
      if (!data || data.totalChars === 0) return 0;
      return Math.round(data.totalSales / data.totalChars);
    });

    const unitPriceChartData = {
      labels: months.map(m => `${Number(m.slice(2, 4))}/${Number(m.slice(5))}`),
      datasets: [
        {
          label: '平均単価 (円/体)',
          data: unitPriceData,
          borderColor: '#5F7D8E',
          backgroundColor: 'rgba(95, 125, 142, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    // --- クリエイター別 報酬ランキング (Top 10) ---
    const sortedCreators = Object.entries(creatorStats)
      .sort((a, b) => b[1].reward - a[1].reward)
      .slice(0, 10);

    const creatorChartData = {
      labels: sortedCreators.map(([name]) => name),
      datasets: [
        {
          label: '獲得報酬額',
          data: sortedCreators.map(([, data]) => data.reward),
          backgroundColor: '#8B9A8B',
          borderColor: '#8B9A8B',
          borderWidth: 1,
          borderRadius: 4,
          indexAxis: 'y' as const, // 横棒グラフ
        }
      ]
    };

    return {
      titleChartData,
      unitPriceChartData,
      creatorChartData,
      totalSales: Object.values(titleStats).reduce((sum, t) => sum + t.sales, 0),
      totalProjects: targetProjects.length,
    };
  }, [projects, period, vendorIndex]);

  if (loading) return <div className="text-center p-10">分析データを読み込み中...</div>;

  return (
    <div className="flex flex-col gap-px bg-earth-200/60">
      <div className="flex flex-wrap justify-between items-center gap-2 p-4 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-earth-800">版権・プロジェクト分析レポート</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-earth-500">期間の総売上 ({analysisData.totalProjects}件)</p>
          <p className="text-2xl font-bold text-earth-900">{formatCurrency(analysisData.totalSales)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px">
        {/* 作品別売上ランキング */}
        <div className="p-6 bg-white/50 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4 text-earth-800">作品別 売上ランキング (TOP10)</h3>
          <div className="h-80">
            <Bar
              data={analysisData.titleChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
              }}
            />
          </div>
        </div>

        {/* 平均単価推移 */}
        <div className="p-6 bg-white/50 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4 text-earth-800">平均単価推移 (円/キャラ)</h3>
          <p className="text-xs text-earth-400 mb-2">※ GLOSS ÷ キャラクター体数 で算出</p>
          <div className="h-80">
            <Line data={analysisData.unitPriceChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      <div className="p-6 bg-white/50 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4 text-earth-800">クリエイター 成果ランキング (TOP10)</h3>
        <div className="h-96">
          <Bar
            data={analysisData.creatorChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CopyrightAnalysis;