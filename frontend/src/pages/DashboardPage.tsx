import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { PageHeaderProps } from '../types';
import ProjectAnalysis from '../features/dashboard/ProjectAnalysis';
import LedgerAnalysis from '../features/dashboard/LedgerAnalysis';
import CopyrightAnalysis from '../features/dashboard/CopyrightAnalysis'; // ★ 新規追加

// ★ 修正点: 'copyright' を追加
type DashboardView = 'sales' | 'expenses' | 'copyright';

const DashboardPage = () => {
  const { setHeaderProps } = useOutletContext<{ setHeaderProps: (props: PageHeaderProps) => void; }>();
  const [view, setView] = useState<DashboardView>('sales');

  useEffect(() => {
    setHeaderProps({
      title: 'ダッシュボード',
      actions: (
        <div className="flex space-x-2 bg-white/20 backdrop-blur-sm p-1 rounded-lg border border-white/20">
          <button
            onClick={() => setView('sales')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${view === 'sales' ? 'bg-earth-500 text-white shadow-md' : 'text-earth-700 hover:bg-white/30'}`}
          >
            売上分析
          </button>
          {/* ★ 修正点: 版権分析ボタンを追加 */}
          <button
            onClick={() => setView('copyright')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${view === 'copyright' ? 'bg-earth-500 text-white shadow-md' : 'text-earth-700 hover:bg-white/30'}`}
          >
            版権分析
          </button>
          <button
            onClick={() => setView('expenses')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${view === 'expenses' ? 'bg-earth-500 text-white shadow-md' : 'text-earth-700 hover:bg-white/30'}`}
          >
            経費分析
          </button>
        </div>
      ),
    });
  }, [setHeaderProps, view]);

  return (
    <div className="w-full min-h-full p-4">
      {view === 'sales' && <ProjectAnalysis />}
      {/* ★ 修正点: 版権分析コンポーネントを表示 */}
      {view === 'copyright' && <CopyrightAnalysis />}
      {view === 'expenses' && <LedgerAnalysis />}
    </div>
  );
};

export default DashboardPage;