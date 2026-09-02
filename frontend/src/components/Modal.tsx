import type { ModalOptions } from '../types';

interface ModalProps {
  isOpen: boolean;
  options: ModalOptions | null;
  onClose: () => void;
}

const ProgressBar = () => (
  <div className="relative w-full bg-white/30 rounded-full h-2 overflow-hidden border border-white/20">
    <style>{`
      @keyframes progress-bar-animation {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .animate-progress-bar {
        animation: progress-bar-animation 2s ease-in-out infinite;
      }
    `}</style>
    <div className="absolute top-0 left-0 h-full w-1/2 bg-earth-500 rounded-full animate-progress-bar shadow-sm"></div>
  </div>
);

const Modal = ({ isOpen, options, onClose }: ModalProps) => {
  if (!isOpen || !options) return null;

  const handleConfirm = async () => {
    if (options.onConfirm) {
      await options.onConfirm();
    }
    onClose();
  };


  const handleCancel = () => {
    options.onCancel?.();
    onClose();
  };

  const hasConfirm = !!options.onConfirm;
  const confirmButtonClasses = 'bg-earth-600 hover:bg-earth-700 focus:ring-earth-500 shadow-md transform hover:scale-[1.02] transition-all';
  const infoButtonClasses = 'bg-earth-600 hover:bg-earth-700 focus:ring-earth-500 shadow-md transform hover:scale-[1.02] transition-all';

  return (
    <div className="fixed inset-0 bg-earth-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="glass-panel p-8 w-full max-w-sm text-center shadow-2xl">
        <h3 className="text-xl font-bold text-earth-900 mb-3">{options.title}</h3>
        <div className="mt-2">
          <p className="text-sm text-earth-700 whitespace-pre-wrap leading-relaxed">{options.message}</p>
        </div>
        <div className="mt-5 sm:mt-6">
          {options.isLoading ? (
            <ProgressBar />
          ) : (
            <div className="flex justify-center space-x-3">
              {options.onCancel && (
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-md border border-white/40 shadow-sm px-4 py-2 bg-white/30 text-base font-medium text-earth-800 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-earth-500 sm:text-sm transition-all"
                  onClick={handleCancel}
                >
                  キャンセル
                </button>
              )}
              <button
                type="button"
                className={`inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:text-sm ${hasConfirm ? confirmButtonClasses : infoButtonClasses
                  }`}
                onClick={handleConfirm}
              >
                {hasConfirm ? 'OK' : '閉じる'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;