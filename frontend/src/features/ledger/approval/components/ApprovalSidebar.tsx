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
        no-print flex-shrink-0 transition-all duration-300
        md:sticky md:top-8 md:mr-8
        ${isStatusOpen
          ? 'block absolute top-0 left-4 right-4 z-20'
          : 'hidden'
        }
        md:block md:relative md:w-80
      `}>
        <div className="flex flex-col gap-8">
          {/* ステータス履歴 */}
          <div className="w-full p-4 bg-white rounded-lg shadow-md">
            <h2 className="pb-2 mb-4 font-semibold border-b">ステータス</h2>
            <div className="space-y-2">
              {statusHistory.map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex flex-col items-center mt-1 mr-4">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>
                      {item.completed && <span className="text-xs font-bold">✓</span>}
                    </div>
                    {index < statusHistory.length - 1 && <div className="w-px h-12 bg-gray-300"></div>}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${item.completed ? 'text-black' : 'text-gray-500'}`}>{item.label}</p>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* レシートプレビュー (デスクトップ版) */}
          <div className="sticky hidden p-4 bg-white rounded-lg shadow-md top-8 md:block">
            <div className="flex items-center justify-between pb-2 mb-4 border-b">
              <h2 className="font-semibold">レシートプレビュー</h2>
              {selectedReceiptUrl && (
                <button
                  onClick={onModalOpen}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white transition-colors duration-200 bg-blue-600 rounded shadow-sm hover:bg-blue-700 active:bg-blue-800"
                >
                  <Maximize2 size={14} />
                  拡大表示
                </button>
              )}
            </div>

            <div
              className="w-full h-[45vh] bg-gray-100 rounded flex items-center justify-center relative overflow-hidden border border-gray-200"
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
                    className="max-w-full max-h-[45vh] object-contain transition-transform duration-200"
                    style={{ transformOrigin: transformOrigin, transform: isHovered ? 'scale(2.5)' : 'scale(1)', }}
                  />
                )
              ) : (<span className="text-gray-500">レシートを選択</span>)}
            </div>
          </div>
        </div>
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