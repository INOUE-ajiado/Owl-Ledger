import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { LedgerReport } from '../../types';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const DeltaIndicator = ({ value, positiveIsGood }: { value: number; positiveIsGood: boolean; }) => {
  if (isNaN(value) || !isFinite(value)) {
    return <span className="text-gray-500">-</span>;
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  let colorClass = 'text-gray-500';

  if (isPositive) {
    colorClass = positiveIsGood ? 'text-green-500' : 'text-red-500';
  } else if (isNegative) {
    colorClass = positiveIsGood ? 'text-red-500' : 'text-green-500';
  }

  const arrow = isPositive ? '▲' : isNegative ? '▼' : '';
  const displayValue = `${Math.abs(value).toFixed(1)}%`;

  return (
    <span className={`font-semibold ${colorClass}`}>
      {arrow} {displayValue}
    </span>
  );
};


const LedgerAnalysis = () => {
  const [reports, setReports] = useState<LedgerReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const querySnapshot = await getDocs(collection(db, "ledgerReports"));
      const reportsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerReport));
      setReports(reportsData);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const pieChartData = useMemo(() => {
    const subjectExpenses: { [key: string]: number } = {};
    reports.forEach(report => {
      report.entries.forEach(entry => {
        if (entry.expense > 0 && Array.isArray(entry.subject)) {
          entry.subject.forEach(subjectName => {
            if (subjectName) {
              subjectExpenses[subjectName] = (subjectExpenses[subjectName] || 0) + entry.expense;
            }
          });
        }
      });
    });

    return {
      labels: Object.keys(subjectExpenses),
      datasets: [{
        label: '出金額',
        data: Object.values(subjectExpenses),
        backgroundColor: ['#BF6A5D', '#8B9A8B', '#C89F65', '#5F7D8E', '#6B705C', '#A78C7C', '#D9C5B2', '#9A8B9A'],
        borderWidth: 0,
      }],
    };
  }, [reports]);

  const summaryData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    const prevMonthDate = new Date(now);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const prevYearDate = new Date(now);
    prevYearDate.setFullYear(prevYearDate.getFullYear() - 1);
    const prevYearKey = `${prevYearDate.getFullYear()}-${String(prevYearDate.getMonth() + 1).padStart(2, '0')}`;

    const totals = {
      current: { income: 0, expense: 0 },
      prevMonth: { income: 0, expense: 0 },
      prevYear: { income: 0, expense: 0 },
    };

    reports.forEach(report => {
      const reportTotalIncome = report.entries.reduce((sum, entry) => sum + entry.income, 0);
      const reportTotalExpense = report.entries.reduce((sum, entry) => sum + entry.expense, 0);

      if (report.month === currentMonthKey) {
        totals.current.income += reportTotalIncome;
        totals.current.expense += reportTotalExpense;
      } else if (report.month === prevMonthKey) {
        totals.prevMonth.income += reportTotalIncome;
        totals.prevMonth.expense += reportTotalExpense;
      } else if (report.month === prevYearKey) {
        totals.prevYear.income += reportTotalIncome;
        totals.prevYear.expense += reportTotalExpense;
      }
    });

    const calcDelta = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? Infinity : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      ...totals,
      delta: {
        vsPrevMonth: {
          income: calcDelta(totals.current.income, totals.prevMonth.income),
          expense: calcDelta(totals.current.expense, totals.prevMonth.expense),
        },
        vsPrevYear: {
          income: calcDelta(totals.current.income, totals.prevYear.income),
          expense: calcDelta(totals.current.expense, totals.prevYear.expense),
        }
      }
    }
  }, [reports]);

  const barChartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const monthlyExpenses: { [key: string]: number } = {};

    reports.forEach(report => {
      const reportYear = parseInt(report.month.substring(0, 4));
      if (reportYear === currentYear || reportYear === lastYear) {
        const totalExpense = report.entries.reduce((sum, entry) => sum + entry.expense, 0);
        monthlyExpenses[report.month] = (monthlyExpenses[report.month] || 0) + totalExpense;
      }
    });

    const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
    const currentYearData = labels.map((_, i) => {
      const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      return monthlyExpenses[monthKey] || 0;
    });
    const lastYearData = labels.map((_, i) => {
      const monthKey = `${lastYear}-${String(i + 1).padStart(2, '0')}`;
      return monthlyExpenses[monthKey] || 0;
    });

    return {
      labels,
      datasets: [
        {
          label: `${currentYear}年 経費`,
          data: currentYearData,
          backgroundColor: '#BF6A5D',
          borderRadius: 4,
        },
        {
          label: `${lastYear}年 経費`,
          data: lastYearData,
          backgroundColor: '#8B9A8B',
          borderRadius: 4,
        },
      ],
    };
  }, [reports]);


  if (loading) return <div className="text-center p-10">経費データを分析中...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4 text-earth-800">科目別 経費分析</h3>
        <div className="flex justify-center h-80">
          {pieChartData.labels.length > 0 ? (
            <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">データがありません</div>
          )}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4 text-earth-800">月次収支サマリー（{new Date().getMonth() + 1}月）</h3>
        <div className="h-80">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-earth-500 uppercase bg-white/10">
              <tr>
                <th className="px-4 py-2">項目</th>
                <th className="px-4 py-2 text-right">当月</th>
                <th className="px-4 py-2 text-right">前月比</th>
                <th className="px-4 py-2 text-right">前年比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              <tr className="border-b border-white/10">
                <td className="px-4 py-3 font-semibold">入金額</td>
                <td className="px-4 py-3 text-right">¥{summaryData.current.income.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <DeltaIndicator value={summaryData.delta.vsPrevMonth.income} positiveIsGood={true} />
                </td>
                <td className="px-4 py-3 text-right">
                  <DeltaIndicator value={summaryData.delta.vsPrevYear.income} positiveIsGood={true} />
                </td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-4 py-3 font-semibold">出金額</td>
                <td className="px-4 py-3 text-right">¥{summaryData.current.expense.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <DeltaIndicator value={summaryData.delta.vsPrevMonth.expense} positiveIsGood={false} />
                </td>
                <td className="px-4 py-3 text-right">
                  <DeltaIndicator value={summaryData.delta.vsPrevYear.expense} positiveIsGood={false} />
                </td>
              </tr>
              <tr className="bg-white/10">
                <td className="px-4 py-3 font-bold">差引収支</td>
                <td className="px-4 py-3 text-right font-bold">¥{(summaryData.current.income - summaryData.current.expense).toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:col-span-2 glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4 text-earth-800">年間経費比較</h3>
        <div className="h-96">
          <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { title: { display: false } } }} />
        </div>
      </div>
    </div>
  );
};

export default LedgerAnalysis;