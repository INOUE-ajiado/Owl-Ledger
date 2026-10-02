import { addDoc, collection, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { recordChange } from '../../api/changeHistory';
import type { Work, WorkCost } from '../../types';
import { defaultWork } from './workMetrics';

// Firestore は undefined を保存できないため取り除く
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const createWork = async (title: string) => {
  const data = clean(defaultWork(title));
  const created = await addDoc(collection(db, 'works'), { ...data, createdAt: Timestamp.now() });
  await recordChange({ targetType: 'work', targetId: created.id, targetLabel: title, action: 'create', before: null, after: { title } });
  return created.id;
};

/** 作品の項目を更新し、変更前後を変更履歴に残す */
export const saveWork = async (work: Work, patch: Partial<Omit<Work, 'id'>>) => {
  const data = clean(patch);
  await updateDoc(doc(db, 'works', work.id), data);
  const before = Object.fromEntries(Object.keys(data).map(k => [k, work[k as keyof Work]]));
  await recordChange({ targetType: 'work', targetId: work.id, targetLabel: work.title, action: 'update', before, after: data });
};

export const deleteWork = async (work: Work) => {
  await deleteDoc(doc(db, 'works', work.id));
  await recordChange({ targetType: 'work', targetId: work.id, targetLabel: work.title, action: 'delete', before: { title: work.title }, after: null });
};

export const saveWorkCost = async (work: Work, cost: Omit<WorkCost, 'id'>, before?: WorkCost) => {
  const data = clean(cost);
  const label = `${work.title} 原価`;
  if (before) {
    await updateDoc(doc(db, 'works', work.id, 'costs', before.id), data);
    const { id: _id, ...prev } = before; // eslint-disable-line @typescript-eslint/no-unused-vars
    await recordChange({ targetType: 'work', targetId: `${work.id}/costs/${before.id}`, targetLabel: label, action: 'update', before: prev, after: data });
  } else {
    const created = await addDoc(collection(db, 'works', work.id, 'costs'), data);
    await recordChange({ targetType: 'work', targetId: `${work.id}/costs/${created.id}`, targetLabel: label, action: 'create', before: null, after: data });
  }
};

export const deleteWorkCost = async (work: Work, cost: WorkCost) => {
  await deleteDoc(doc(db, 'works', work.id, 'costs', cost.id));
  const { id: _id, ...prev } = cost; // eslint-disable-line @typescript-eslint/no-unused-vars
  await recordChange({ targetType: 'work', targetId: `${work.id}/costs/${cost.id}`, targetLabel: `${work.title} 原価`, action: 'delete', before: prev, after: null });
};
