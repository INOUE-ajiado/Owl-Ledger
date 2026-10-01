import type { Vendor } from '../types';

/**
 * 名寄せ用に氏名を正規化する。全角/半角・空白・先頭の丸数字 (①②…) の違いを無視する。
 * 例: 「新山 恵美子」「新山恵美子」「①新山 恵美子」→ 同じキー
 */
export const normalizeName = (name: string) =>
  (name || '')
    .replace(/^[①-⑳⓪㉑-㉟㊱-㊿]+/, '')
    .normalize('NFKC')
    .replace(/[\s\u3000]+/g, '')
    .toLowerCase();

/** 内訳の名前 (と vendorId) から外注先を引くための索引 */
export const buildVendorIndex = (vendors: Vendor[]) => {
  const byId = new Map<string, Vendor>();
  const byName = new Map<string, Vendor>();
  vendors.forEach(v => {
    byId.set(v.id, v);
    [v.name, ...(v.aliases || [])].forEach(n => {
      const key = normalizeName(n);
      if (key && !byName.has(key)) byName.set(key, v);
    });
  });
  return {
    resolve: (name: string, vendorId?: string): Vendor | undefined =>
      (vendorId ? byId.get(vendorId) : undefined) ?? byName.get(normalizeName(name)),
  };
};
