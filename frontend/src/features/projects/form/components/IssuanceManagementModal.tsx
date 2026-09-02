import { useState } from 'react';
import { X, Printer, Receipt, Code } from 'lucide-react';
import type { Project, BreakdownItem } from '../../../../types';
import { useModal } from '../../../../contexts';

interface IssuanceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const IssuanceManagementModal = ({ isOpen, onClose, project }: IssuanceManagementModalProps) => {
  // 表示モード切り替え用のステート ('invoice' | 'receipt')
  const [activeTab, setActiveTab] = useState<'invoice' | 'receipt'>('invoice');
  const { showModal } = useModal();

  if (!isOpen) return null;

  const handlePrint = (index: number) => {
    // 現在のタブに基づいてパスを決定
    const path = activeTab === 'invoice' ? 'personal-invoice' : 'personal-receipt';
    window.open(`/print/${path}/${project.id}?index=${index}`, '_blank');
  };

  const handleCSSExport = () => {
    const cssVars = project.breakdown.map((item, index) => {
      const i = index + 1;
      return `  --purchaser-${i}-name: "${item.name}";\n  --purchaser-${i}-amount: ${item.amount};`;
    }).join('\n');

    const cssContent = `:root {\n${cssVars}\n}`;

    navigator.clipboard.writeText(cssContent).then(() => {
      showModal({
        title: "CSS出力成功",
        message: "購入者データ（CSS変数形式）をクリップボードにコピーしました。",
        type: 'info'
      });
    }).catch(err => {
      console.error("Failed to copy CSS:", err);
      showModal({
        title: "エラー",
        message: "コピーに失敗しました。",
        type: 'error'
      });
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">

        {/* ヘッダー */}
        <div className="flex items-center justify-between flex-shrink-0 px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">発行管理</h3>
            <p className="mt-1 text-sm text-gray-500">{project.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* ★ 切り替えタブ */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('invoice')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'invoice'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Printer size={16} />
            請求書
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'receipt'
                ? 'border-green-500 text-green-600 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Receipt size={16} />
            領収書
          </button>
        </div>

        {/* コンテンツ: 購入者リスト */}
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
            {activeTab === 'invoice' ? (
              <p>各購入者の<span className="font-bold text-blue-600">請求書</span>を発行します。</p>
            ) : (
              <p>各購入者の<span className="font-bold text-green-600">領収書</span>を発行します。</p>
            )}
            <button
              onClick={handleCSSExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors shadow-sm"
              title="データをCSS変数形式でコピー"
            >
              <Code size={14} />
              CSS出力
            </button>
          </div>

          <table className="min-w-full overflow-hidden border divide-y divide-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  購入者名
                </th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                  金額
                </th>
                <th scope="col" className="w-32 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                  発行
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {project.breakdown.map((item: BreakdownItem, index: number) => (
                <tr key={index} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-right text-gray-500 whitespace-nowrap">
                    ¥ {Number(item.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap">
                    {/* アクティブなタブに応じてボタンを切り替え */}
                    {activeTab === 'invoice' ? (
                      <button
                        onClick={() => handlePrint(index)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors shadow-sm"
                        title="請求書を発行"
                      >
                        <Printer size={14} />
                        請求書発行
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePrint(index)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors shadow-sm"
                        title="領収書を発行"
                      >
                        <Receipt size={14} />
                        領収書発行
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {project.breakdown.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-sm text-center text-gray-500">
                    購入者データが登録されていません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* フッター */}
        <div className="flex justify-end flex-shrink-0 px-6 py-4 border-t rounded-b-lg bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssuanceManagementModal;