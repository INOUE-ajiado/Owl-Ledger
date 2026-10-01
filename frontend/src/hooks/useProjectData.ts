import { useEffect, useState } from 'react';
import { collection, collectionGroup, onSnapshot } from 'firebase/firestore';
import { db } from '../api/firebase';
import type { Project, PurchaseOrder } from '../types';

/** 削除済みを除く全プロジェクト */
export const useProjects = (enabled = true) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(enabled);
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)).filter(p => p.status !== '削除済み'));
      setLoading(false);
    }, (error) => {
      console.error('プロジェクトの読み込みに失敗しました:', error);
      setLoading(false);
    });
  }, [enabled]);
  return { projects, loading };
};

export type PurchaseOrderWithProject = PurchaseOrder & { projectDocId: string };

/** 全プロジェクトの発注書 (サブコレクションをまとめて取得) */
export const usePurchaseOrders = (enabled = true) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithProject[]>([]);
  const [loading, setLoading] = useState(enabled);
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(collectionGroup(db, 'purchaseOrders'), (snap) => {
      setPurchaseOrders(snap.docs.map(d => ({ id: d.id, projectDocId: d.ref.parent.parent?.id ?? '', ...d.data() } as PurchaseOrderWithProject)));
      setLoading(false);
    }, (error) => {
      console.error('発注書の読み込みに失敗しました:', error);
      setLoading(false);
    });
  }, [enabled]);
  return { purchaseOrders, loading };
};
