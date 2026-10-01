import { useState } from 'react';
import type { Project, PurchaseOrder } from '../../../types';
import PurchaseOrderPasswordModal from '../PurchaseOrderPasswordModal'; // パス調整
import { usePurchaseOrderData } from './hooks/usePurchaseOrderData';
import { usePurchaseOrderGrouping } from './hooks/usePurchaseOrderGrouping';
import { usePurchaseOrderIssue } from './hooks/usePurchaseOrderIssue';
import { PurchaseOrderList } from './components/PurchaseOrderList';
import { useStaff, useVendors } from '../../../hooks/useMasters';
import { useCompanySettings } from '../../../hooks/useCompanySettings';

const PurchaseOrderModal = ({ project, onClose, onSaveGrouping }: { project: Project; onClose: () => void; onSaveGrouping: (grouping: { id: string, indices: number[] }[]) => void; }) => {
  const [passwordModalTarget, setPasswordModalTarget] = useState<PurchaseOrder | null>(null);

  // Hooks
  const { issuedPOs, displayItems, setDisplayItems, loading } = usePurchaseOrderData(project);
  const { 
    mode, primaryIndex, checkedIndices, 
    resetGroupingState, handlePrimarySelect, handleCheckboxChange, handleGroupingAction, handleUngroup 
  } = usePurchaseOrderGrouping({ project, displayItems, setDisplayItems, onSaveGrouping });
  
  const isInternalSale = project.projectType === 'internal_sale';
  const { activeStaff } = useStaff();
  const { vendorIndex } = useVendors();
  const { settings } = useCompanySettings();
  // 発注担当者 (初期値は版権担当者)
  const [staffName, setStaffName] = useState(project.copyrightManager || '');
  const { handleIssue, handleGroupIssue } = usePurchaseOrderIssue(project, {
    isInternalSale, staffName, taxRate: settings.taxRate, resolveVendor: vendorIndex.resolve,
  });

  const modalTitle = isInternalSale ? '請求書 発行管理' : '発注書 管理';
  const primarySelectedItem = primaryIndex !== null ? project.breakdown[primaryIndex] : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black bg-opacity-50 sm:p-4">
        <div className="bg-gray-50 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-3xl max-h-[90vh] sm:max-h-[80vh] flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">{modalTitle} - {project.title}</h3>
                    {mode === 'default' && <p className="mt-1 text-xs text-gray-500">項目をクリックして選択し、「グループ化」ボタンを押してください。</p>}
                    {mode === 'grouping' && <p className="mt-1 text-xs text-blue-600">「{primarySelectedItem?.name}」の項目をまとめて発行します。対象を選択してください。</p>}
                </div>
                {mode === 'default' && ( <button onClick={handleGroupingAction} disabled={primaryIndex === null} className="px-4 py-2 ml-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 whitespace-nowrap">グループ化</button> )}
                {mode === 'grouping' && ( <div className="flex items-center ml-4 space-x-2"><button onClick={resetGroupingState} className="px-4 py-2 text-sm font-medium bg-gray-200 rounded-md">キャンセル</button><button onClick={handleGroupingAction} disabled={checkedIndices.size < 2} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-300 whitespace-nowrap">確定</button></div> )}
            </div>
            
            {!isInternalSale && (
              <label className="flex flex-wrap items-center gap-2 mb-3 text-sm text-gray-700">
                発注担当者
                <select value={staffName} onChange={e => setStaffName(e.target.value)} className="py-1 text-sm border-gray-300 rounded-md">
                  <option value="">選択してください</option>
                  {staffName && !activeStaff.some(s => s.name === staffName) && <option value={staffName}>{staffName}</option>}
                  {activeStaff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <span className="text-xs text-gray-500">新しく発行する発注書に印字されます</span>
              </label>
            )}
            <div className="flex-grow pr-2 overflow-y-auto">
            {loading ? (<div className="py-10 text-center">読み込み中...</div>) : (
                <PurchaseOrderList 
                    displayItems={displayItems}
                    issuedPOs={issuedPOs}
                    isInternalSale={isInternalSale}
                    mode={mode}
                    primaryIndex={primaryIndex}
                    checkedIndices={checkedIndices}
                    primarySelectedItemName={primarySelectedItem?.name}
                    onPrimarySelect={handlePrimarySelect}
                    onCheckboxChange={handleCheckboxChange}
                    onUngroup={handleUngroup}
                    onIssue={handleIssue}
                    onGroupIssue={handleGroupIssue}
                    onOpenPasswordModal={setPasswordModalTarget}
                />
            )}
            </div>
            <div className="flex justify-end mt-6"> <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">閉じる</button></div>
        </div>
      </div>
      {passwordModalTarget && (
        <PurchaseOrderPasswordModal
          projectId={project.id}
          purchaseOrder={passwordModalTarget}
          onClose={() => setPasswordModalTarget(null)}
        />
      )}
    </>
  );
};

export default PurchaseOrderModal;