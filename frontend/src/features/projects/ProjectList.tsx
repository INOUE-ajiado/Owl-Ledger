import { useState, useEffect, useRef } from 'react';
import type { Project } from '../../types';
import { Link } from 'react-router-dom';

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}

const Icon = ({ path, className = "w-5 h-5" }: { path: string, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const ProjectList = ({ projects, loading, onEdit, onDelete }: ProjectListProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  useEffect(() => {
    document.documentElement.classList.add('overflow-y-scroll');
    return () => {
      document.documentElement.classList.remove('overflow-y-scroll');
    };
  }, []);

  const toggleMenu = (projectId: string) => {
    setOpenMenuId(openMenuId === projectId ? null : projectId);
  };

  if (loading) {
    return <div className="p-10 text-center">プロジェクトを読み込み中...</div>;
  }

  return (
    <div className="overflow-visible bg-white rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">依頼受注日</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">管理ID</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">作品名</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">クライアント</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">ステータス</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">アクション</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {projects.length > 0 ? (
            projects.map(project => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{project.registrationDate}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{project.projectId}</td>
                <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{project.title}</td>
                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{project.clientName}</td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${project.status === '完了' ? 'bg-green-100 text-green-800' :
                      project.status === '請求済' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                  <div className="flex items-center justify-end space-x-4">
                    <button onClick={() => onEdit(project)} className="text-indigo-600 hover:text-indigo-900">編集</button>
                    <button onClick={() => onDelete(project.id)} className="text-red-600 hover:text-red-900">削除</button>
                    <div className="relative">
                      <button
                        onClick={() => toggleMenu(project.id)}
                        className="p-1 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Icon path="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                      </button>
                      {openMenuId === project.id && (
                        <div ref={menuRef} className="absolute right-0 z-20 mt-2 origin-top-right bg-white rounded-md shadow-lg w-36 ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            <Link to={`/print/quotation/${project.id}`} target="_blank" className="block w-full px-4 py-2 text-sm text-left text-gray-700 transition-colors duration-150 hover:bg-gray-100">
                              御見積書
                            </Link>
                            {/* ★ 修正箇所: 承認・ログ機能付きのURLに変更 */}
                            <Link to={`/order-confirmation-approval/${project.id}`} target="_blank" className="block w-full px-4 py-2 text-sm text-left text-gray-700 transition-colors duration-150 hover:bg-gray-100">
                              受注伝票
                            </Link>
                            <Link to={`/print/invoice/${project.id}`} target="_blank" className="block w-full px-4 py-2 text-sm text-left text-gray-700 transition-colors duration-150 hover:bg-gray-100">
                              請求書
                            </Link>
                            <Link to={`/print/purchase-order/${project.id}`} target="_blank" className="block w-full px-4 py-2 text-sm text-left text-gray-700 transition-colors duration-150 hover:bg-gray-100">
                              発注書
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={6} className="py-10 text-center text-gray-500">条件に一致するプロジェクトはありません。</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectList;