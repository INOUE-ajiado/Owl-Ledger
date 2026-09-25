import { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import type { LedgerReport } from '../../../../types';

interface ApprovalSidebarProps {
  report: LedgerReport;
  selectedReceiptUrl: string | null;
  isStatusOpen: boolean;
  onModalOpen: () => void;
}

const formatDate = (timestamp: { seconds: number; nanoseconds: number; } | undefined) => {
  if (!timestamp) return '---';
  return new Date(timestamp.seconds * 1000).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

export const ApprovalSidebar = ({ report, selectedReceiptUrl, isStatusOpen, onModalOpen }: ApprovalSidebarProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState('center center');
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTransformOrigin(`${x}% ${y}%`);
  };

  const statusHistory = [
    { label: '書類発行', date: formatDate(report.submittedAt), completed: !!report.submittedAt },
    { label: '代表承認', date: formatDate(report.approvedAt), completed: !!report.approvedAt },
    { label: '経理提出', date: formatDate(report.accountingSubmittedAt), completed: !!report.accountingSubmittedAt },
  ];

  return (
    <>
      <aside className={`
        no-print flex-shrink-0 bg-white
        ${isStatusOpen
          ? 'block absolute top-0 inset-x-0 z-20 shadow-lg border-b border-gray-200'
          : 'hidden'
        }
        md:flex md:flex-col md:sticky md:top-16 md:inset-auto md:z-auto md:shadow-none md:border-b-0
        md:w-80 lg:w-96 md:h-[calc(100vh-4rem)] md:border-r md:border-gray-200 md:bg-gray-50
      `}>
        {/* ステータス履歴 */}
        <section className="flex-shrink-0 px-5 py-4 border-b border-gray-200">
          <h2 className="mb-3 text-xs font-bold tracking-wider text-gray-500">ステータス</h2>
          <ol>
            {statusHistory.map((item, index) => (
              <li key={index} className="flex items-start">
                <div className="flex flex-col items-center mt-0.5 mr-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.completed ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-gray-300'}`}>
                    {item.completed && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  {index < statusHistory.length - 1 && (
                    <div className={`w-0.5 h-7 ${statusHistory[index + 1].completed ? 'bg-emerald-400' : 'bg-gray-200'}`}></div>
                  )}
                </div>
                <div className="flex items-baseline justify-between flex-1 min-w-0 gap-2">
                  <p className={`text-sm font-medium ${item.completed ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</p>
                  <p className="text-xs text-gray-500 tabular-nums">{item.date}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* レシートプレビュー (デスクトップ版) */}
        <section className="flex-col flex-1 hidden min-h-0 px-5 py-4 md:flex">
          <div className="flex items-center justify-between flex-shrink-0 mb-3">
            <h2 className="text-xs font-bold tracking-wider text-gray-500">レシートプレビュー</h2>
            {selectedReceiptUrl && (
              <button
                onClick={onModalOpen}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white transition-colors duration-200 bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 active:bg-blue-800"
              >
                <Maximize2 size={14} />
                拡大表示
              </button>
            )}
          </div>

          <div
            className="relative flex items-center justify-center flex-1 min-h-[240px] overflow-hidden bg-white border border-gray-200 rounded-lg"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={handleMouseMove}
          >
            {selectedReceiptUrl ? (
              selectedReceiptUrl.toLowerCase().includes('.pdf') ? (
                <iframe src={selectedReceiptUrl} className="w-full h-full pointer-events-none" title="receipt-preview"></iframe>
              ) : (
                <img
                  src={selectedReceiptUrl}
                  alt="Receipt"
                  className="object-contain max-w-full max-h-full transition-transform duration-200"
                  style={{ transformOrigin: transformOrigin, transform: isHovered ? 'scale(2.5)' : 'scale(1)', }}
                />
              )
            ) : (<span className="text-sm text-gray-400">明細の「表示」をクリックするとレシートが表示されます</span>)}
          </div>
        </section>
      </aside>

      {/* スマホ版: レシートプレビューフローティングボタン */}
      {selectedReceiptUrl && (
        <button
          onClick={() => setIsMobilePreviewOpen(true)}
          className="fixed z-40 flex items-center gap-2 px-4 py-3 text-sm font-bold text-white transition-all bg-blue-600 rounded-full shadow-lg md:hidden bottom-6 right-6 hover:bg-blue-700 active:scale-95"
        >
          <Maximize2 size={18} />
          レシート表示
        </button>
      )}

      {/* スマホ版: レシートプレビューモーダル */}
      {isMobilePreviewOpen && selectedReceiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 md:hidden"
          onClick={() => setIsMobilePreviewOpen(false)}
        >
          <div
            className="relative w-full h-full max-w-lg max-h-[90vh] mx-4 my-8 bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-800">レシートプレビュー</h3>
              <button
                onClick={() => setIsMobilePreviewOpen(false)}
                className="p-2 text-gray-600 rounded-full hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* レシート表示エリア（ピンチズーム対応） */}
            <div className="flex items-center justify-center w-full h-[calc(100%-60px)] overflow-auto bg-gray-100 touch-pan-x touch-pan-y touch-pinch-zoom">
              {selectedReceiptUrl.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={selectedReceiptUrl}
                  className="w-full h-full"
                  title="receipt-mobile-preview"
                ></iframe>
              ) : (
                <img
                  src={selectedReceiptUrl}
                  alt="Receipt"
                  className="object-contain max-w-full max-h-full"
                  style={{ touchAction: 'pinch-zoom' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};