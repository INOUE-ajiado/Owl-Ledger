import { X, KeyRound } from 'lucide-react';
import type { PurchaseOrder } from '../../../../types';
// ★ 修正: GroupedItem をインポートに追加
import type { DisplayItem, GroupedItem } from '../hooks/usePurchaseOrderData';

interface PurchaseOrderListProps {
  displayItems: DisplayItem[];
  issuedPOs: PurchaseOrder[];
  isInternalSale: boolean;
  mode: 'default' | 'grouping';
  primaryIndex: number | null;
  checkedIndices: Set<number>;
  primarySelectedItemName?: string;
  onPrimarySelect: (index: number) => void;
  onCheckboxChange: (index: number) => void;
  onUngroup: (id: string) => void;
  onIssue: (index: number) => void;
  // ★ 修正: any から GroupedItem に変更
  onGroupIssue: (item: GroupedItem) => void;
  onOpenPasswordModal: (po: PurchaseOrder) => void;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ja-JP').format(Math.round(amount));

const arrayEquals = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const PurchaseOrderList = ({
  displayItems, issuedPOs, isInternalSale, mode, primaryIndex, checkedIndices, primarySelectedItemName,
  onPrimarySelect, onCheckboxChange, onUngroup, onIssue, onGroupIssue, onOpenPasswordModal
}: PurchaseOrderListProps) => {
  
  const issueButtonLabel = isInternalSale ? '請求書発行' : '発行';

  return (
    <div className="space-y-3">
      {displayItems.map(item => {
        // 表示項目ごとのインデックスを取得
        const indices = ('isGroup' in item ? item.items.map(i => i.originalIndex) : [item.originalIndex]).sort((a,b)=>a-b);
        // 既に発行済みのデータがあるか確認
        const issuedPO = issuedPOs.find(po => po.includedIndices && arrayEquals(po.includedIndices.sort((a,b)=>a-b), indices));

        if ('isGroup' in item) {
          // --- グループ表示 ---
          const totalAmount = item.items.reduce((sum, i) => sum + i.amount, 0);
          return (
            <div key={item.id} className="p-3 border-2 border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-blue-800">{item.items[0].name} のグループ ({item.items.length}件)</span>
                <button onClick={() => onUngroup(item.id)} className="flex items-center text-xs text-gray-500 hover:text-red-600">
                  <X size={14} className="mr-1" /> グループ解除
                </button>
              </div>
              <div className="pl-2 space-y-1">
                {item.items.map(subItem => (
                  <div key={subItem.originalIndex} className="flex justify-between text-sm">
                    <span>{subItem.content}</span><span>¥{formatCurrency(subItem.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 mt-1 font-bold border-t"><span>合計</span><span>¥{formatCurrency(totalAmount)}</span></div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                {issuedPO && !isInternalSale && (
                  <button onClick={() => onOpenPasswordModal(issuedPO)} className={`p-2 rounded-md hover:bg-blue-100 ${issuedPO.password ? 'text-yellow-600' : 'text-gray-400'}`}>
                    <KeyRound size={18} />
                  </button>
                )}
                <button onClick={() => onGroupIssue(item)} className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">
                  {issuedPO ? '再発行' : 'グループを発行'}
                </button>
              </div>
            </div>
          );
        } else {
          // --- 単体表示 ---
          const isPrimary = primaryIndex === item.originalIndex;
          const canBeGrouped = mode === 'grouping' && primarySelectedItemName === item.name;
          const isChecked = checkedIndices.has(item.originalIndex);
          
          return (
            <div 
              key={item.originalIndex}
              onClick={() => {
                if (mode === 'default') onPrimarySelect(item.originalIndex);
                else if (canBeGrouped) onCheckboxChange(item.originalIndex);
              }}
              className={`grid grid-cols-12 gap-x-4 items-center bg-white p-3 rounded-md border-l-4 transition-all
                ${(mode === 'default' || canBeGrouped) ? 'cursor-pointer' : ''}
                ${isPrimary ? 'bg-blue-50 border-blue-500' : 'border-transparent'}
                ${mode === 'grouping' && !canBeGrouped ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex justify-center col-span-1">
                {mode === 'grouping' && canBeGrouped ? (
                  <input type="checkbox" checked={isChecked} readOnly className="w-5 h-5 pointer-events-none" />
                ) : issuedPO ? (
                  !isInternalSale ? (
                    <button onClick={(e) => { e.stopPropagation(); onOpenPasswordModal(issuedPO);}} className={`p-1 rounded-md hover:bg-gray-100 ${issuedPO.password ? 'text-yellow-600' : 'text-gray-400'}`}>
                      <KeyRound size={18} />
                    </button>
                  ) : <div className="text-xs text-green-600">済</div>
                ) : (<div className="w-8 h-8"></div>) }
              </div>
              <div className="col-span-4 font-medium">{item.name} <span className="text-xs text-gray-500">({item.content})</span></div>
              <div className="col-span-3 text-right">¥{formatCurrency(item.amount)}</div>
              <div className="col-span-2 text-center">
                {issuedPO ? <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full">発行済み</span>
                : <span className="inline-flex px-2 text-xs font-semibold leading-5 text-gray-800 bg-gray-100 rounded-full">未発行</span>}
              </div>
              <div className="col-span-2 text-center">
                <button onClick={(e) => { e.stopPropagation(); onIssue(item.originalIndex); }} className={`text-xs px-3 py-1 rounded-md ${issuedPO ? 'bg-gray-200 hover:bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {issuedPO ? '再発行' : issueButtonLabel}
                </button>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};