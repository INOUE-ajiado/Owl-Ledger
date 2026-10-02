import { useState } from 'react';
import { formatYen } from '../../utils/money';

export const inputClass = 'block w-full px-2 py-1 text-sm border-gray-300 rounded-md shadow-sm';
export const btnPrimary = 'px-3 py-1.5 text-xs font-medium text-white rounded-md bg-earth-600 hover:bg-earth-700 disabled:opacity-40';
export const btnSecondary = 'px-3 py-1.5 text-xs font-medium bg-white border rounded-md text-earth-800 border-earth-200 hover:bg-earth-50';
export const th = 'px-3 py-2 font-medium whitespace-nowrap';
export const td = 'px-3 py-2';

export const yen = (amount: number) => `${Math.round(amount) < 0 ? '-' : ''}¥${formatYen(Math.abs(amount))}`;

export const statusTone = (status: 'ok' | 'warn' | 'over') => (status === 'over' ? 'red' : status === 'warn' ? 'yellow' : 'green') as 'red' | 'yellow' | 'green';
export const statusLabel = (status: 'ok' | 'warn' | 'over') => (status === 'over' ? '超過' : status === 'warn' ? '90%超' : '予算内');

/** パネル単位の編集 (編集を押すと下書きを作り、保存で書き込む) */
export const useEditable = <T,>(value: T, onSave: (draft: T) => Promise<void>) => {
  const [draft, setDraft] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (draft === null) return;
    setSaving(true);
    try {
      await onSave(draft);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };
  return {
    editing: draft !== null,
    draft: draft ?? value,
    setDraft: (next: T) => setDraft(next),
    start: () => setDraft(structuredClone(value)),
    cancel: () => setDraft(null),
    save,
    saving,
  };
};

/** 配列の i 番目を差し替える */
export const replaceAt = <T,>(list: T[], index: number, patch: Partial<T>) => list.map((x, i) => (i === index ? { ...x, ...patch } : x));
export const removeAt = <T,>(list: T[], index: number) => list.filter((_, i) => i !== index);
