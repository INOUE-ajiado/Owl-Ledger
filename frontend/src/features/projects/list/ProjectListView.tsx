import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, CornerDownRight, Folder, FolderOpen, KeyRound, LockKeyhole, MoreVertical } from 'lucide-react';
import type { Project } from '../../../types';
import OrderStatusBadge from './OrderStatusBadge';
import { StatusBadge } from '../../../components/DetailParts';

interface ProjectListViewProps {
  projects: Project[];
  isSearching: boolean;
  expandedProjectIds: Set<string>;
  onToggleExpand: (projectId: string) => void;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onOpenPOModal: (project: Project) => void;
  onOpenPassword: (project: Project) => void;
  canWrite: boolean;
  isAdmin: boolean;
}

const hasPassword = (p: Project) => !!(p.previewPasswordHash || p.previewPassword);

/** 帳票メニュー (見積書・受注伝票・請求書・発送伝票・発注書) */
const DocumentMenu = ({ project, onOpenPOModal, onClose }: { project: Project; onOpenPOModal: () => void; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const itemClass = 'block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100';
  return (
    <div ref={ref} className="absolute right-0 z-20 w-48 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
      <div className="py-1">
        {project.projectType !== 'master' && (
          <>
            <Link to={`/print/quotation/${project.id}`} target="_blank" className={itemClass}>御見積書</Link>
            <Link to={`/order-confirmation-approval/${project.id}`} target="_blank" className={itemClass}>受注伝票（承認）</Link>
            <Link to={`/print/invoice/${project.id}`} target="_blank" className={itemClass}>請求書</Link>
            <Link to={`/print/shipping-slip/${project.id}`} target="_blank" className={itemClass}>発送伝票</Link>
          </>
        )}
        <button onClick={onOpenPOModal} className={itemClass}>
          {project.projectType === 'internal_sale' ? '請求書発行管理' : '発注書を管理'}
        </button>
      </div>
    </div>
  );
};

/** プロジェクト一覧。PC は表、スマホはカードで表示する */
const ProjectListView = (props: ProjectListViewProps) => {
  const { projects, isSearching, expandedProjectIds, onToggleExpand, onOpen, onEdit, onDelete, onOpenPOModal, onOpenPassword, canWrite, isAdmin } = props;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // 検索していないときは、閉じているマスターの子プロジェクトを隠す
  const visible = projects.filter(p => !(p.projectType === 'sub' && !isSearching && p.masterProjectId && !expandedProjectIds.has(p.masterProjectId)));

  const renderActions = (project: Project) => (
    <div className="flex items-center justify-end space-x-2">
      {!project.isFixed && canWrite && (
        <button onClick={() => onEdit(project)} className="px-2 font-medium text-blue-500 transition-colors hover:text-blue-700">編集</button>
      )}
      {!project.isFixed && isAdmin && (
        <button onClick={() => onDelete(project)} className="px-2 font-medium text-red-500 transition-colors hover:text-red-700">削除</button>
      )}
      <div className="relative">
        <button onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)} className="p-2 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600" aria-label="帳票メニュー">
          <MoreVertical size={18} />
        </button>
        {openMenuId === project.id && (
          <DocumentMenu project={project} onClose={() => setOpenMenuId(null)} onOpenPOModal={() => { setOpenMenuId(null); onOpenPOModal(project); }} />
        )}
      </div>
    </div>
  );

  const expandButton = (project: Project) => {
    const isExpanded = expandedProjectIds.has(project.id);
    return (
      <button onClick={(e) => { e.stopPropagation(); onToggleExpand(project.id); }}
        className="flex items-center justify-center p-2 text-blue-600 rounded-md hover:bg-blue-100" title={isExpanded ? '閉じる' : '開く'}>
        {isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
        {isExpanded ? <ChevronDown size={14} className="ml-1" /> : <ChevronRight size={14} className="ml-1" />}
      </button>
    );
  };

  return (
    <div className="w-full bg-white/40 backdrop-blur-sm border-b border-white/20">
      {/* スマホ: カード表示 */}
      <ul className="divide-y md:hidden divide-white/40">
        {visible.length === 0 && <li className="py-10 text-center text-gray-500">条件に一致するプロジェクトはありません。</li>}
        {visible.map(project => (
          <li key={project.id} className={`flex items-start gap-2 px-3 py-3 ${project.projectType === 'master' ? 'bg-earth-100/50' : ''}`}>
            {project.projectType === 'master' && expandButton(project)}
            {project.projectType === 'sub' && <CornerDownRight size={16} className="flex-shrink-0 mt-1 text-gray-400" />}
            <button type="button" onClick={() => onOpen(project)} className="flex-1 min-w-0 text-left">
              <p className="font-medium truncate text-earth-900">{project.title}</p>
              <p className="text-xs truncate text-earth-600">{project.projectId} ・ {project.clientName}</p>
              <p className="mt-1 text-xs text-earth-500">{project.registrationDate} <StatusBadge status={project.status} /><OrderStatusBadge status={project.orderConfirmationStatus} /></p>
            </button>
            <div onClick={(e) => e.stopPropagation()}>{renderActions(project)}</div>
          </li>
        ))}
      </ul>

      {/* PC: 表 */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-white/20">
          <thead className="bg-white/10">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"></th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">保護</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">依頼受注日</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">管理ID</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">作品名</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">クライアント</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {visible.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-gray-500">条件に一致するプロジェクトはありません。</td></tr>
            )}
            {visible.map(project => {
              const isMaster = project.projectType === 'master';
              return (
                <tr key={project.id} onClick={() => onOpen(project)} className={`cursor-pointer transition-colors hover:bg-white/40 ${isMaster ? 'bg-earth-100/50 font-semibold' : ''}`}>
                  <td className="px-2 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {isMaster && expandButton(project)}
                    {project.projectType === 'sub' && <CornerDownRight size={16} className="mx-auto text-gray-400" />}
                  </td>
                  <td className="px-2 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {canWrite && !isMaster && (
                      <button onClick={() => onOpenPassword(project)} className={`p-2 rounded-md hover:bg-gray-100 ${hasPassword(project) ? 'text-yellow-600' : 'text-gray-400'}`}
                        title={hasPassword(project) ? 'パスワードを変更' : 'プレビューパスワードを設定'}>
                        {hasPassword(project) ? <LockKeyhole size={18} /> : <KeyRound size={18} />}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{project.registrationDate}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{project.projectId}</td>
                  <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{project.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{project.clientName}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <StatusBadge status={project.status} />
                    <OrderStatusBadge status={project.orderConfirmationStatus} />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {renderActions(project)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectListView;
