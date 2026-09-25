import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { LedgerEntry } from '../../../../types';

interface ReceiptBottomSheetProps {
  entry: LedgerEntry;
  onClose: () => void;
}

const ANIMATION_MS = 300;
// この距離以上、または素早く下にスワイプしたら閉じる
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 0.5; // px/ms

// スマホ用: 下から出現するエッジトゥーエッジのレシートプレビュー。上部をつかんで下へスワイプすると閉じる
export const ReceiptBottomSheet = ({ entry, onClose }: ReceiptBottomSheetProps) => {
  const [isShown, setIsShown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ y: 0, time: 0 });
  const closeTimer = useRef<number | undefined>(undefined);

  const url = entry.receiptImageUrl ?? '';
  const isPdf = url.toLowerCase().includes('.pdf');

  useEffect(() => {
    // 初期位置(画面外)を描画してからスライドインさせる
    const frame = requestAnimationFrame(() => setIsShown(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(closeTimer.current);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const close = () => {
    setIsShown(false);
    setIsDragging(false);
    closeTimer.current = window.setTimeout(onClose, ANIMATION_MS);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { y: e.clientY, time: e.timeStamp };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragY(Math.max(0, e.clientY - dragStart.current.y));
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const distance = Math.max(0, e.clientY - dragStart.current.y);
    const velocity = distance / Math.max(1, e.timeStamp - dragStart.current.time);
    if (distance > CLOSE_DISTANCE || (distance > 30 && velocity > CLOSE_VELOCITY)) {
      close();
    } else {
      setIsDragging(false);
      setDragY(0);
    }
  };

  const transition = isDragging ? 'none' : `transform ${ANIMATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;

  return (
    <div className="fixed inset-0 z-[70] sm:hidden no-print">
      <div
        className="absolute inset-0 bg-black/60"
        style={{ opacity: isShown ? 1 : 0, transition: `opacity ${ANIMATION_MS}ms ease` }}
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="レシートプレビュー"
        className="absolute inset-x-0 bottom-0 flex flex-col h-[92dvh] bg-white rounded-t-2xl shadow-2xl overflow-hidden"
        style={{ transform: isShown ? `translateY(${dragY}px)` : 'translateY(100%)', transition }}
      >
        {/* つかんで下にスワイプすると閉じる領域 */}
        <div
          className="flex-shrink-0 px-4 pt-2 pb-3 border-b border-gray-200 cursor-grab select-none touch-none bg-gray-50"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div className="w-10 h-1.5 mx-auto mb-2 bg-gray-300 rounded-full" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">{entry.date.replace(/-/g, '/')}{entry.payee && ` · ${entry.payee}`}</p>
              <p className="text-sm font-bold text-gray-800 truncate">{entry.description || 'レシート'}</p>
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={close}
              className="flex-shrink-0 p-2 text-gray-600 rounded-full hover:bg-gray-200 active:bg-gray-300"
              aria-label="閉じる"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center flex-1 min-h-0 overflow-auto bg-gray-100">
          {isPdf ? (
            <iframe src={url} className="w-full h-full border-none" title="receipt-sheet-preview" />
          ) : (
            <img src={url} alt="Receipt" className="object-contain max-w-full max-h-full" />
          )}
        </div>
      </div>
    </div>
  );
};
