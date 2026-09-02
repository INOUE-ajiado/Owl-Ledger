import { useState } from 'react';
import { X, Edit, Trash2, Printer, FileText, ShoppingCart, FileCheck, Layers } from 'lucide-react';
import type { Project } from '../../../types';

// ★重要: スクリーンショットの構成に基づき、隣のformフォルダを参照します
// もしエラーが出る場合はパスを '../form/IssuanceManagementModal' などに調整してください
import { IssuanceManagementModal } from '../form/components/IssuanceManagementModal';

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export const ProjectDetail = ({ project, onClose, onEdit, onDelete }: ProjectDetailProps) => {
  // 発行管理モーダルの開閉状態
  const [isIssuanceModalOpen, setIsIssuanceModalOpen] = useState(false);

  // 通常の印刷画面を開くヘルパー関数
  const handlePrint = (type: 'quotation' | 'delivery' | 'invoice' | 'purchase-order' | 'order-confirmation') => {
    window.open(`/print/${type}/${project.id}`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  };

  const typeLabels: Record<string, string> = {
    standard: '通常案件',
    master: 'マスタープロジェクト',
    sub: '子プロジェクト',
    internal_sale: '社内販売',
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-xl">
      {/* ヘッダー */}
      <div className="px-4 py-6 border-b border-gray-200 bg-gray-50 sm:px-6">
        <div className="flex items-start justify-between space-x-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-gray-900">{project.title}</h2>
              {/* バッジ表示 */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                project.projectType === 'internal_sale' 
                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}>
                {typeLabels[project.projectType] || 'その他'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{project.clientName}</p>
          </div>
          <div className="flex items-center gap-2 h-7">
            <button
              onClick={() => onEdit(project)}
              className="text-gray-400 transition-colors hover:text-gray-500"
              title="編集"
            >
              <Edit size={20} />
            </button>
            <button
              onClick={() => onDelete(project)}
              className="text-gray-400 transition-colors hover:text-red-500"
              title="削除"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={onClose}
              className="ml-2 text-gray-400 transition-colors hover:text-gray-500"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* 詳細コンテンツ */}
      <div className="flex-1 p-6 overflow-y-auto">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">プロジェクトID</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{project.projectId}</dd>
          </div>

          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">登録日</dt>
            <dd className="mt-1 text-sm text-gray-900">{project.registrationDate.replace(/-/g, '/')}</dd>
          </div>

          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">ステータス</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                project.status === '完了' ? 'bg-green-100 text-green-800' :
                project.status === '請求済' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {project.status}
              </span>
            </dd>
          </div>

          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">請求総額</dt>
            <dd className="mt-1 text-sm font-bold text-gray-900">
              {formatCurrency(project.gloss)} 
              <span className="ml-1 text-xs font-normal text-gray-500">
                ({project.taxType === 'inclusive' ? '税込' : '税抜'})
              </span>
            </dd>
          </div>

          {project.projectType === 'master' && (
            <div className="sm:col-span-1">
               <dt className="text-sm font-medium text-gray-500">総予算</dt>
               <dd className="mt-1 text-sm text-gray-900">{formatCurrency(project.totalBudget || 0)}</dd>
            </div>
          )}
          
          {(project.projectType === 'sub' || project.projectType === 'internal_sale') && (
            <div className="sm:col-span-1">
               <dt className="text-sm font-medium text-gray-500">
                 {project.projectType === 'internal_sale' ? '合計金額' : '配分額'}
               </dt>
               <dd className="mt-1 text-sm text-gray-900">{formatCurrency(project.allocatedAmount || project.gloss)}</dd>
            </div>
          )}

          <div className="sm:col-span-2">
            <dt className="mb-2 text-sm font-medium text-gray-500">
              {project.projectType === 'internal_sale' ? '購入者リスト' : '内訳'}
            </dt>
            <dd className="overflow-hidden text-sm text-gray-900 border border-gray-200 rounded-md bg-gray-50">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium text-left text-gray-500">
                      {project.projectType === 'internal_sale' ? '名前' : '項目'}
                    </th>
                    <th className="px-3 py-2 text-xs font-medium text-right text-gray-500">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {project.breakdown.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 font-mono text-sm text-right text-gray-900">
                        {Number(item.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {project.breakdown.length === 0 && (
                     <tr>
                       <td colSpan={2} className="px-3 py-4 text-xs text-center text-gray-500">データなし</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </dd>
          </div>

          {project.remarks && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">備考</dt>
              <dd className="p-2 mt-1 text-sm text-gray-900 whitespace-pre-wrap border rounded bg-gray-50">
                {project.remarks}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* フッターアクション (ボタン出し分けの肝となる部分) */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 bg-gray-50 sm:px-6">
        <div className="flex flex-wrap justify-end gap-3">
          
          {/* ★ projectType が 'internal_sale' なら「発行管理」ボタンのみ表示 */}
          {project.projectType === 'internal_sale' ? (
            
            <button
              onClick={() => setIsIssuanceModalOpen(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Layers className="w-4 h-4 mr-2" />
              請求書 発行管理
            </button>

          ) : (

            /* ★ それ以外なら、通常の4つのボタンを表示 */
            <>
              <button
                onClick={() => handlePrint('quotation')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                <FileText className="w-4 h-4 mr-2 text-gray-500" />
                見積書
              </button>
              
              <button
                onClick={() => handlePrint('delivery')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                <ShoppingCart className="w-4 h-4 mr-2 text-gray-500" />
                受注伝票
              </button>

              <button
                onClick={() => handlePrint('invoice')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                <Printer className="w-4 h-4 mr-2 text-gray-500" />
                請求書
              </button>

              <button
                onClick={() => handlePrint('purchase-order')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                <FileCheck className="w-4 h-4 mr-2 text-gray-500" />
                発注書
              </button>
            </>
          )}

        </div>
      </div>

      {/* モーダル (社内販売用) */}
      <IssuanceManagementModal
        isOpen={isIssuanceModalOpen}
        onClose={() => setIsIssuanceModalOpen(false)}
        project={project}
      />
    </div>
  );
};