import type { Project, Vendor } from '../../types';
import type { PurchaseOrderWithProject } from '../../hooks/useProjectData';
import { normalizeName } from '../../utils/names';

type Resolver = { resolve: (name: string, vendorId?: string) => Vendor | undefined };

// 外注先への配分 (内訳) を持つのは通常・子プロジェクト。マスターは予算配分、社内販売は購入者
export const isVendorBreakdownProject = (p: Project) => p.projectType === 'standard' || p.projectType === 'sub' || !p.projectType;

export interface VendorAssignment {
  project: Project;
  itemIndex: number;
  name: string;
  content?: string;
  amount: number;
}

/** 外注先ごとの担当案件 (内訳) を集める。未登録の名前は正規化した名前ごとにまとめる */
export const collectAssignments = (projects: Project[], index: Resolver) => {
  const byVendor = new Map<string, VendorAssignment[]>();
  const unregistered = new Map<string, { variants: Map<string, number>; assignments: VendorAssignment[] }>();
  projects.filter(isVendorBreakdownProject).forEach(project => {
    (project.breakdown || []).forEach((item, itemIndex) => {
      if (!item.name?.trim()) return;
      const assignment: VendorAssignment = { project, itemIndex, name: item.name, content: item.content, amount: Number(item.amount) || 0 };
      const vendor = index.resolve(item.name, item.vendorId);
      if (vendor) {
        byVendor.set(vendor.id, [...(byVendor.get(vendor.id) ?? []), assignment]);
      } else {
        const key = normalizeName(item.name);
        const entry = unregistered.get(key) ?? { variants: new Map<string, number>(), assignments: [] as VendorAssignment[] };
        entry.variants.set(item.name, (entry.variants.get(item.name) ?? 0) + 1);
        entry.assignments.push(assignment);
        unregistered.set(key, entry);
      }
    });
  });
  return { byVendor, unregistered };
};

/** 発注書を外注先ごとにまとめる */
export const groupPurchaseOrders = (purchaseOrders: PurchaseOrderWithProject[], index: Resolver) => {
  const map = new Map<string, PurchaseOrderWithProject[]>();
  purchaseOrders.forEach(po => {
    const vendor = index.resolve(po.workerName, po.vendorId);
    if (vendor) map.set(vendor.id, [...(map.get(vendor.id) ?? []), po]);
  });
  return map;
};

export const sumBy = <T,>(items: T[], pick: (item: T) => number) => items.reduce((sum, item) => sum + (pick(item) || 0), 0);
