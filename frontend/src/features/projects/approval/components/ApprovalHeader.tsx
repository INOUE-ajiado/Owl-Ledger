import { Menu } from 'lucide-react';
import type { Project } from '../../../../types';

interface ApprovalHeaderProps {
  project: Project;
  canWrite: boolean;
  onToggleStatus: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onCopyUrl: () => void;
  onPrint: () => void;
}

export const ApprovalHeader = ({ 
  project, canWrite, 
  onToggleStatus, onSubmit, onApprove, onCopyUrl, onPrint 
}: ApprovalHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-4 text-white bg-gray-800 no-print">
      <button onClick={onToggleStatus} className="p-2 md:hidden">
        <Menu size={24} />
      </button>
      <div className="flex-grow text-center">
        {/* ★ 修正: デバッグ表示を削除 */}
        <p>受注伝票 承認プレビュー (ID: {project.projectId})</p>
        
        <div className="mt-2 space-x-4">
          
          {/* 承認依頼の提出ボタン (未提出/未承認 かつ 編集権限ありの場合) */}
          {canWrite && project.orderConfirmationStatus !== '承認済み' && project.orderConfirmationStatus !== '承認待ち' && (
            <button onClick={onSubmit} className="px-4 py-2 bg-yellow-500 rounded hover:bg-yellow-600">
              承認依頼を提出
            </button>
          )}
          
          {/* 承認ボタン (承認待ちかつ編集権限ありの場合のみ表示) */}
          {project.orderConfirmationStatus === '承認待ち' && canWrite && (
            <>
              <button onClick={onApprove} className="px-4 py-2 bg-green-500 rounded hover:bg-green-600">
                承認する
              </button>
              
              {/* URLコピーボタン (承認待ちで編集権限ありの場合) */}
              <button onClick={onCopyUrl} className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600">
                URLコピー
              </button>
            </>
          )}
          
          {/* 承認済みステータス表示 */}
          {project.orderConfirmationStatus === '承認済み' && (
            <span className="px-4 py-2 text-sm font-semibold bg-blue-500 rounded">承認済み</span>
          )}
          
          {/* 印刷ボタン */}
          <button onClick={onPrint} className="px-4 py-2 bg-gray-500 rounded hover:bg-gray-600">
            このページを印刷
          </button>
        </div>
      </div>
      <div className="w-10 md:hidden"></div> 
    </div>
  );
};