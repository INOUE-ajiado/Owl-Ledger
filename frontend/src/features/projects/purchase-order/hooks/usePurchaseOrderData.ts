import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../api/firebase';
import type { Project, PurchaseOrder, BreakdownItem } from '../../../../types';

// 表示用の型定義
export type GroupedItem = { id: string; isGroup: true; items: (BreakdownItem & { originalIndex: number })[] };
export type SingleItem = BreakdownItem & { originalIndex: number };
export type DisplayItem = SingleItem | GroupedItem;

export const usePurchaseOrderData = (project: Project) => {
  const [issuedPOs, setIssuedPOs] = useState<PurchaseOrder[]>([]);
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 発行済みデータの監視
  useEffect(() => {
    const poCollectionRef = collection(db, 'projects', project.id, 'purchaseOrders');
    const q = query(poCollectionRef, orderBy('issuedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIssuedPOs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [project.id]);

  // 2. 表示用データの構築（グループ化情報の適用）
  useEffect(() => {
    const savedGrouping = project.purchaseOrderGrouping || [];
    const groupedIndices = new Set(savedGrouping.flatMap(g => g.indices));
    
    const initialItems: DisplayItem[] = [];

    // グループ化された項目を追加
    savedGrouping.forEach(group => {
      initialItems.push({
        id: group.id,
        isGroup: true,
        items: group.indices.map(index => ({...project.breakdown[index], originalIndex: index }))
      });
    });

    // グループ化されていない項目を追加
    project.breakdown.forEach((item, index) => {
      if (!groupedIndices.has(index)) {
        initialItems.push({ ...item, originalIndex: index });
      }
    });

    // 元のインデックス順（グループの場合は先頭要素のインデックス）でソート
    const getSortIndex = (item: DisplayItem): number => 
      'isGroup' in item ? item.items[0].originalIndex : item.originalIndex;
      
    setDisplayItems(initialItems.sort((a,b) => getSortIndex(a) - getSortIndex(b)));
  }, [project]);

  return { issuedPOs, displayItems, setDisplayItems, loading };
};