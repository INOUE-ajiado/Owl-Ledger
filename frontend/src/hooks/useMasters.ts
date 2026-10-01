import { useMemo } from 'react';
import { useCollection } from './useCollection';
import type { Staff, Vendor } from '../types';
import { buildVendorIndex } from '../utils/names';

/** 社員マスタ (表示順・氏名順) */
export const useStaff = (enabled = true) => {
  const { items, loading } = useCollection<Staff>('staff', enabled);
  const staff = useMemo(() => [...items].sort((a, b) =>
    (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name, 'ja')), [items]);
  const activeStaff = useMemo(() => staff.filter(s => s.active !== false), [staff]);
  return { staff, activeStaff, loading };
};

/** 外注先マスタ (読み仮名・氏名順) と名寄せ用の索引 */
export const useVendors = (enabled = true) => {
  const { items, loading } = useCollection<Vendor>('vendors', enabled);
  const vendors = useMemo(() => [...items].sort((a, b) =>
    (a.kana || a.name).localeCompare(b.kana || b.name, 'ja')), [items]);
  const vendorIndex = useMemo(() => buildVendorIndex(vendors), [vendors]);
  return { vendors, vendorIndex, loading };
};

/** ログイン中のユーザーに紐づく社員 (承認印の名前に使う) */
export const findStaffByEmail = (staff: Staff[], email: string | null | undefined) =>
  email ? staff.find(s => s.email && s.email.toLowerCase() === email.toLowerCase()) : undefined;
