import { useMemo } from 'react';
import { FolderArchive, X, Edit } from 'lucide-react';
import type { Project } from '../../../../types';
import { KpiCard } from './KpiCard';

const formatCurrency = (amount: number) => `¥${new Intl.NumberFormat('ja-JP').format(Math.round(amount))}`;

interface MasterProjectViewProps {
  project: Project;
  allProjects: Project[];
  onClose: () => void;
  onEdit: (project: Project) => void;
}

export const MasterProjectView = ({ project, allProjects, onClose, onEdit }: MasterProjectViewProps) => {
  const { subProjects, totalAllocated, remainingBudget } = useMemo(() => {
    const subProjects = allProjects.filter(p => p.masterProjectId === project.id);
    const totalAllocated = subProjects.reduce((sum, p) => sum + (p.allocatedAmount || 0), 0);
    const remainingBudget = (project.totalBudget || 0) - totalAllocated;
    return { subProjects, totalAllocated, remainingBudget };
  }, [project, allProjects]);

  const budgetUsagePercentage = (project.totalBudget || 0) > 0 ? (totalAllocated / (project.totalBudget || 1)) * 100 : 0;

  return (
    <div className="flex flex-col h-full overflow-y-scroll bg-white shadow-xl">
      <div className="px-4 py-6 bg-blue-50 sm:px-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <FolderArchive size={28} className="text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold leading-6 text-gray-900" id="slide-over-title">
                {project.title} (マスター)
              </h2>
              <p className="mt-1 text-sm text-gray-500">{project.projectId}</p>
            </div>
          </div>
          <div className="flex items-center ml-3 h-7">
            <button type="button" className="text-gray-400 rounded-md bg-blue-50 hover:text-gray-500" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative flex-1 px-4 mt-6 sm:px-6">
        <h3 className="mb-4 text-base font-semibold leading-6 text-gray-900">予算サマリー</h3>
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
          <KpiCard title="年間総予算" value={formatCurrency(project.totalBudget || 0)} />
          <KpiCard title="使用済み合計" value={formatCurrency(totalAllocated)} colorClass="text-orange-600" />
          <KpiCard title="残額" value={formatCurrency(remainingBudget)} colorClass="text-green-600" />
        </div>
        <div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${budgetUsagePercentage}%` }}></div>
          </div>
        </div>

        <h3 className="mt-8 mb-4 text-base font-semibold leading-6 text-gray-900">子プロジェクト一覧</h3>
        <div className="flow-root">
          <ul className="-my-5 divide-y divide-gray-200">
            {subProjects.map(sub => (
              <li key={sub.id} className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{sub.title}</p>
                    <p className="text-sm text-gray-500 truncate">{sub.projectId}</p>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-600 rounded-md bg-gray-50">
                      {formatCurrency(sub.allocatedAmount || 0)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 sm:px-6">
        <div className="flex justify-end">
          <button type="button" onClick={() => onEdit(project)} className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500">
            <Edit size={16} className="mr-2 -ml-1" />
            編集
          </button>
        </div>
      </div>
    </div>
  );
};