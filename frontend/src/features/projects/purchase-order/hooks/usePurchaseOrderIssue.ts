import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../api/firebase';
import { nextDocNumber } from '../../../../api/numbering';
import { recordChange } from '../../../../api/changeHistory';
import type { Project, Vendor } from '../../../../types';
import type { GroupedItem } from './usePurchaseOrderData';
import { calcWithholdingTax, formatYen, formatYmdSlash } from '../../../../utils/money';

interface IssueOptions {
  isInternalSale: boolean;
  staffName: string;
  taxRate: number;
  resolveVendor: (name: string, vendorId?: string) => Vendor | undefined;
}

/**
 * 発注書の金額内訳。消費税は税抜金額 × 税率 (1円未満切り捨て)、
 * 源泉徴収は個人・源泉対象の外注先のみ、税抜金額に対して計算する。
 */
export const calcPurchaseOrderPayment = (amount: number, taxRate: number, vendor?: Pick<Vendor, 'type' | 'withholding'>) => {
  const tax = Math.floor(amount * taxRate / 100);
  const withholdingTax = vendor && vendor.type === 'individual' && vendor.withholding ? calcWithholdingTax(amount) : 0;
  return { tax, withholdingTax, paymentAmount: amount + tax - withholdingTax };
};

export const usePurchaseOrderIssue = (project: Project, { isInternalSale, staffName, taxRate, resolveVendor }: IssueOptions) => {

  // 同じ内訳の組み合わせで発行済みならそれを開き、なければ発行時点の情報で発注書を作る
  const findOrCreatePO = async (indices: number[]): Promise<string> => {
    const poCollectionRef = collection(db, 'projects', project.id, 'purchaseOrders');
    const sortedIndices = [...indices].sort((a, b) => a - b);
    const snapshot = await getDocs(query(poCollectionRef, where('includedIndices', '==', sortedIndices)));
    if (!snapshot.empty) return snapshot.docs[0].id;

    const items = sortedIndices.map(i => project.breakdown[i]);
    const amount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const now = new Date();
    const base = {
      workerName: items[0].name,
      amount,
      issuedAt: Timestamp.fromDate(now),
      issueDate: formatYmdSlash(now),
      includedIndices: sortedIndices,
    };
    let data: Record<string, unknown> = base;
    if (!isInternalSale) {
      const vendor = resolveVendor(items[0].name, items[0].vendorId);
      data = {
        ...base,
        poNumber: await nextDocNumber('P', now),
        staffName,
        vendorId: vendor?.id ?? '',
        vendorType: vendor?.type ?? 'individual',
        invoiceRegistrationNumber: vendor?.invoiceRegistrationNumber ?? '',
        taxRate,
        ...calcPurchaseOrderPayment(amount, taxRate, vendor),
      };
    }
    const newPO = await addDoc(poCollectionRef, data);
    await recordChange({
      targetType: 'project', targetId: project.id, targetLabel: `${project.title} (${project.projectId})`,
      action: 'create', before: null, after: { purchaseOrders: { [newPO.id]: data } }, ignoreKeys: ['purchaseOrders.' + newPO.id + '.issuedAt'],
    });
    return newPO.id;
  };

  const issue = async (indices: number[], label: string, amount: number) => {
    const docName = isInternalSale ? '請求書' : '発注書';
    if (!isInternalSale && !staffName) {
      alert('発注担当者を選択してください。');
      return;
    }
    if (!window.confirm(`${label} 宛の${docName}（金額：¥${formatYen(amount)}）を発行しますか？`)) return;

    // ポップアップブロックを避けるため、先にタブを開いてから URL を設定する
    const win = window.open('', '_blank');
    try {
      const poId = await findOrCreatePO(indices);
      const url = isInternalSale
        ? `/print/personal-invoice/${project.id}?index=${indices[0]}`
        : `/print/purchase-order/${project.id}?poId=${poId}`;
      if (win) win.location.href = url; else window.open(url, '_blank');
    } catch (error) {
      win?.close();
      console.error('発行に失敗しました:', error);
      alert(`${docName}の発行に失敗しました。`);
    }
  };

  const handleIssue = (workerIndex: number) => {
    const item = project.breakdown[workerIndex];
    return issue([workerIndex], item.name, item.amount);
  };

  const handleGroupIssue = (group: GroupedItem) =>
    issue(group.items.map(item => item.originalIndex), group.items[0].name, group.items.reduce((sum, item) => sum + item.amount, 0));

  return { handleIssue, handleGroupIssue };
};
