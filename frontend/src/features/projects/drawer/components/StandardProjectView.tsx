import { useState } from 'react';
import { X, Edit, FileText, Printer, ShoppingCart, FileCheck, Layers, Link2, History } from 'lucide-react';
import type { Project } from '../../../../types';
import { ProjectDetailRow } from './ProjectDetailRow';
import { IssuanceManagementModal } from '../../form/components/IssuanceManagementModal';
import { useCompanySettings } from '../../../../hooks/useCompanySettings';
import { projectFinancials, formatYen } from '../../../../utils/money';
import { ChangeHistoryModal } from '../../../history/ChangeHistoryList';

const formatCurrency = (amount: number) => `¥${new Intl.NumberFormat('ja-JP').format(Math.round(amount))}`;

interface StandardProjectViewProps {
  project: Project;
  onClose: () => void;
  onEdit: (project: Project) => void;
  onOpenPOModal: () => void;
  canEdit: boolean;
  isAdmin: boolean;
  onCopyLink: () => void;
}

export const StandardProjectView = ({ project, onClose, onEdit, onOpenPOModal, canEdit, isAdmin, onCopyLink }: StandardProjectViewProps) => {
  const [isIssuanceModalOpen, setIsIssuanceModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ★ 修正: 受注伝票の場合は「承認ページ」を開き、それ以外は「印刷ページ」を開くように変更
  const handlePrint = (type: 'quotation' | 'invoice' | 'purchase-order' | 'order-confirmation') => {
    if (type === 'order-confirmation') {
      // 承認機能・ログ機能・印刷機能がすべて備わったページへ遷移
      window.open(`/order-confirmation-approval/${project.id}`, '_blank');
    } else {
      // その他のドキュメントは従来の印刷ページへ
      window.open(`/print/${type}/${project.id}`, '_blank');
    }
  };

  const { settings } = useCompanySettings();
  const taxType = project.taxType || 'exclusive';
  const { base: glossInput, margin, net } = projectFinancials(project, settings.taxRate);

  return (
    <div className="flex flex-col h-full overflow-y-scroll bg-white shadow-xl">
      <div className="px-4 py-6 bg-gray-50 sm:px-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold leading-6 text-gray-900" id="slide-over-title">
              {project.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{project.projectId}</p>
          </div>
          <div className="flex items-center gap-2 ml-3 h-7">
            <button type="button" onClick={onCopyLink} className="p-1 text-gray-400 rounded-md hover:text-gray-600" title="このプロジェクトのリンクをコピー">
              <Link2 size={20} />
            </button>
            {isAdmin && (
              <button type="button" onClick={() => setIsHistoryOpen(true)} className="p-1 text-gray-400 rounded-md hover:text-gray-600" title="変更履歴">
                <History size={20} />
              </button>
            )}
            <button type="button" className="text-gray-400 rounded-md bg-gray-50 hover:text-gray-500" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative flex-1 px-4 mt-6 sm:px-6">
        <div className="divide-y divide-gray-200">
          <div>
            <h3 className="text-base font-semibold leading-6 text-gray-900">基本情報</h3>
            <dl className="mt-2 divide-y divide-gray-200">
              <ProjectDetailRow label="クライアント" value={project.clientName} />
              <ProjectDetailRow label="依頼受注日" value={project.registrationDate} />
              <ProjectDetailRow label="納期" value={project.dueDate || '未設定'} />
              <ProjectDetailRow label="カテゴリ" value={project.category} />
              <ProjectDetailRow label="主担当作業者" value={project.workerName} />
              <ProjectDetailRow label="版権担当者" value={project.copyrightManager || '未設定'} />
              <ProjectDetailRow 
                label="ステータス" 
                value={
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ 
                    project.status === '完了' ? 'bg-green-100 text-green-800' : 
                    project.status === '請求済' ? 'bg-blue-100 text-blue-800' : 
                    'bg-yellow-100 text-yellow-800' 
                  }`}>
                    {project.status}
                  </span>
                } 
              />
            </dl>
          </div>
          <div className="pt-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">金額情報</h3>
            <dl className="mt-2 divide-y divide-gray-200">
              <ProjectDetailRow 
                label={project.projectType === 'sub' ? '捻出額' : 'GLOSS'} 
                value={`${formatCurrency(glossInput)} ${project.projectType === 'standard' ? `(${taxType === 'inclusive' ? '税込' : '税抜'})` : ''}`} 
              />
              <ProjectDetailRow label="MARGIN料率" value={`${project.marginRate}%`} />
              <ProjectDetailRow label="MARGIN (会社取り分)" value={formatCurrency(margin)} />
              <ProjectDetailRow label="NET (作業者取り分合計)" value={formatCurrency(net)} />
            </dl>
          </div>
          {project.projectType !== 'internal_sale' && (
            <div className="pt-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">帳票</h3>
              <dl className="mt-2 divide-y divide-gray-200">
                <ProjectDetailRow label="見積書番号" value={project.quotationNumber ?? (project.firstQuotationDate ? project.projectId : '未発行')} />
                <ProjectDetailRow
                  label="請求書"
                  value={project.isFixed
                    ? `${project.fixedInvoiceData?.invoiceNumber ?? project.projectId} (${project.fixedInvoiceData?.issueDate} 確定・¥${formatYen(project.fixedInvoiceData?.total ?? 0)})`
                    : '未確定'}
                />
              </dl>
              {(project.invoiceHistory?.length ?? 0) > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-gray-500">取消済みの請求書</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {project.invoiceHistory!.map((record, i) => (
                      <li key={i} className="p-2 rounded bg-gray-50">
                        <span className="font-mono">{record.invoiceNumber}</span>
                        <span className="ml-2 text-gray-500">¥{formatYen(record.total)}・{record.cancelledAt.slice(0, 10)} 取消</span>
                        <p className="text-xs text-gray-600">理由: {record.cancelReason}</p>
                        {record.creditNoteNumber && (
                          <a href={`/print/credit-note/${project.id}?no=${encodeURIComponent(record.creditNoteNumber)}`} target="_blank" rel="noreferrer" className="text-xs text-red-700 underline">
                            赤伝 {record.creditNoteNumber} を表示
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="pt-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">NET内訳</h3>
            <ul className="mt-2 divide-y divide-gray-200">
              {project.breakdown.map((item, index) => (
                <li key={index} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.content}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</p>
                    <p className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      {/* フッターアクション */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            
            {project.projectType === 'internal_sale' ? (
              <button
                onClick={() => setIsIssuanceModalOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Layers className="w-4 h-4 mr-2" />
                請求書 発行管理
              </button>
            ) : (
              <>
                <button
                  onClick={() => handlePrint('quotation')}
                  className="flex items-center justify-center px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md shadow-sm hover:bg-gray-200"
                >
                  <FileText size={16} className="mr-2" />見積書
                </button>
                <button
                  onClick={() => handlePrint('order-confirmation')}
                  className="flex items-center justify-center px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md shadow-sm hover:bg-gray-200"
                >
                  <ShoppingCart size={16} className="mr-2" />受注伝票
                </button>
                <button
                  onClick={() => handlePrint('invoice')}
                  className="flex items-center justify-center px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md shadow-sm hover:bg-gray-200"
                >
                  <Printer size={16} className="mr-2" />請求書
                </button>
                <button 
                  type="button" 
                  onClick={onOpenPOModal} 
                  className="flex items-center justify-center px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md shadow-sm hover:bg-gray-200"
                >
                  <FileCheck size={16} className="mr-2" />発注書
                </button>
              </>
            )}

          </div>
          {canEdit && !project.isFixed && (
            <button type="button" onClick={() => onEdit(project)} className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500">
              <Edit size={16} className="mr-2 -ml-1" />
              編集
            </button>
          )}
          {project.isFixed && <span className="text-xs text-gray-500">請求確定済みのため編集できません (請求書画面から取消できます)</span>}
        </div>
      </div>

      {isHistoryOpen && (
        <ChangeHistoryModal targetId={project.id} title={`${project.title} (${project.projectId})`} onClose={() => setIsHistoryOpen(false)} />
      )}
      <IssuanceManagementModal
        isOpen={isIssuanceModalOpen}
        onClose={() => setIsIssuanceModalOpen(false)}
        project={project}
      />
    </div>
  );
};