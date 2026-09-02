import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../api/firebase';
import type { Project } from '../../../../types';
import type { GroupedItem } from './usePurchaseOrderData';

const formatCurrency = (amount: number) => new Intl.NumberFormat('ja-JP').format(Math.round(amount));

export const usePurchaseOrderIssue = (project: Project, isInternalSale: boolean) => {
  
  const findOrCreatePO = async (indices: number[]): Promise<string> => {
    const poCollectionRef = collection(db, 'projects', project.id, 'purchaseOrders');
    const sortedIndices = [...indices].sort((a,b) => a - b);
    const q = query(poCollectionRef, where('includedIndices', '==', sortedIndices));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    } else {
      const items = indices.map(i => project.breakdown[i]);
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const newPO = await addDoc(poCollectionRef, {
        workerName: items[0].name,
        amount: totalAmount,
        issuedAt: Timestamp.now(),
        includedIndices: sortedIndices,
      });
      return newPO.id;
    }
  };
  
  const handleIssue = async (workerIndex: number) => {
    const item = project.breakdown[workerIndex];
    const docName = isInternalSale ? '請求書' : '発注書';

    if (!window.confirm(`${item.name} 宛の${docName}（金額：¥${formatCurrency(item.amount)}）を発行しますか？`)) return;
    
    const poId = await findOrCreatePO([workerIndex]);
    
    if (isInternalSale) {
        window.open(`/print/personal-invoice/${project.id}?index=${workerIndex}`, '_blank');
    } else {
        window.open(`/print/purchase-order/${project.id}?poId=${poId}`, '_blank');
    }
  };

  const handleGroupIssue = async (group: GroupedItem) => {
    const totalAmount = group.items.reduce((sum, item) => sum + item.amount, 0);
    const docName = isInternalSale ? '請求書' : '発注書';

    if (!window.confirm(`${group.items[0].name} 宛の${docName}（合計金額：¥${formatCurrency(totalAmount)}）を発行しますか？`)) return;
    
    const indices = group.items.map(item => item.originalIndex);
    const poId = await findOrCreatePO(indices);

    if (isInternalSale) {
        window.open(`/print/personal-invoice/${project.id}?index=${indices[0]}`, '_blank');
    } else {
        window.open(`/print/purchase-order/${project.id}?poId=${poId}`, '_blank');
    }
  };

  return { handleIssue, handleGroupIssue };
};