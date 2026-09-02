interface ApprovalLinkModalProps {
  link: string;
  onClose: () => void;
  onCopy: (link: string) => void;
}

export const ApprovalLinkModal = ({ link, onClose, onCopy }: ApprovalLinkModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="w-full max-w-lg p-8 text-center bg-white rounded-lg shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-gray-900">承認用リンクが生成されました</h3>
        <p className="mb-6 text-sm text-gray-600">リンクをコピーして、代表者に送付してください。</p>
        <div className="flex items-center space-x-2">
          <input 
            type="text" 
            readOnly 
            value={link} 
            className="w-full p-2 text-sm bg-gray-100 border rounded-md" 
          />
          <button 
            onClick={() => onCopy(link)}
            className="px-4 py-2 text-sm text-white transition-colors duration-150 bg-blue-600 rounded-md active:bg-blue-800 whitespace-nowrap"
          >
            コピー
          </button>
        </div>
        <button 
          onClick={onClose} 
          className="w-full py-2 mt-8 text-gray-700 transition-colors duration-150 bg-gray-200 rounded-md active:bg-gray-300"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};