import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { db } from '../api/firebase';
import { useAppOutletContext, useModal } from '../contexts';
import { useVendors } from '../hooks/useMasters';
import { useProjects, usePurchaseOrders } from '../hooks/useProjectData';
import { recordChange } from '../api/changeHistory';
import VendorForm from '../features/vendors/VendorForm';
import { collectAssignments, groupPurchaseOrders, sumBy } from '../features/vendors/vendorStats';
import { formatYen } from '../utils/money';
import type { Vendor } from '../types';

const VendorPage = () => {
  const { setHeaderProps, permissions } = useAppOutletContext();
  const { showModal } = useModal();
  const canWrite = permissions?.isAdmin === true || permissions?.permissions?.clients === 'write';
  const { vendors, vendorIndex, loading } = useVendors();
  const { projects } = useProjects();
  const { purchaseOrders } = usePurchaseOrders();
  const [form, setForm] = useState<{ vendor: Vendor | null; initial?: Partial<Vendor> } | null>(null);
  const [linkTargets, setLinkTargets] = useState<Record<string, string>>({});

  useEffect(() => {
    setHeaderProps({
      title: '外注先管理',
      actions: canWrite ? (
        <button onClick={() => setForm({ vendor: null })} className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-md bg-earth-600 hover:bg-earth-700">
          外注先を追加
        </button>
      ) : undefined,
    });
  }, [setHeaderProps, canWrite]);

  const { byVendor, unregistered } = useMemo(() => collectAssignments(projects, vendorIndex), [projects, vendorIndex]);
  const posByVendor = useMemo(() => groupPurchaseOrders(purchaseOrders, vendorIndex), [purchaseOrders, vendorIndex]);

  // 件数の多い順に、未登録の名前 (表記ゆれをまとめたもの) を並べる
  const unregisteredGroups = useMemo(() => Array.from(unregistered.entries())
    .map(([key, entry]) => ({
      key,
      variants: Array.from(entry.variants.entries()).sort((a, b) => b[1] - a[1]),
      count: entry.assignments.length,
      amount: sumBy(entry.assignments, a => a.amount),
    }))
    .sort((a, b) => b.count - a.count), [unregistered]);

  const linkToVendor = async (groupKey: string, variants: string[]) => {
    const vendorId = linkTargets[groupKey];
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;
    try {
      await updateDoc(doc(db, 'vendors', vendor.id), { aliases: arrayUnion(...variants) });
      await recordChange({
        targetType: 'vendor', targetId: vendor.id, targetLabel: vendor.name, action: 'update',
        changes: [{ field: 'aliases', before: (vendor.aliases ?? []).join(', '), after: Array.from(new Set([...(vendor.aliases ?? []), ...variants])).join(', ') }],
      });
    } catch (error) {
      console.error('紐付けに失敗しました:', error);
      showModal({ title: 'エラー', message: '紐付けに失敗しました。' });
    }
  };

  if (loading) return <div className="p-10 text-center">外注先を読み込み中...</div>;

  return (
    <div className="w-full min-h-full pb-10">
      <div className="bg-white/40 backdrop-blur-sm border-b border-white/20">
        {/* スマホ: カード表示 */}
        <ul className="divide-y md:hidden divide-white/40">
          {vendors.map(v => {
            const assignments = byVendor.get(v.id) ?? [];
            return (
              <li key={v.id}>
                <Link to={`/vendors/${v.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-white/40">
                  <div className="min-w-0">
                    <p className="font-medium truncate text-earth-900">{v.name}</p>
                    <p className="text-xs text-earth-600">{v.type === 'individual' ? '個人' : '法人'}{v.withholding ? '・源泉あり' : ''} ・ {assignments.length}件 ・ ¥{formatYen(sumBy(assignments, a => a.amount))}</p>
                  </div>
                  <ChevronRight size={18} className="flex-shrink-0 text-earth-400" />
                </Link>
              </li>
            );
          })}
        </ul>
        {/* PC: 表 */}
        <table className="hidden min-w-full md:table divide-y divide-white/20">
          <thead className="bg-white/10">
            <tr className="text-xs font-medium tracking-wider text-left text-gray-500">
              <th className="px-6 py-3">氏名・名称</th>
              <th className="px-6 py-3">区分</th>
              <th className="px-6 py-3">インボイス登録番号</th>
              <th className="px-6 py-3">源泉徴収</th>
              <th className="px-6 py-3 text-right">担当件数</th>
              <th className="px-6 py-3 text-right">配分額合計</th>
              <th className="px-6 py-3 text-right">発注書</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {vendors.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-500">外注先が登録されていません。</td></tr>}
            {vendors.map(v => {
              const assignments = byVendor.get(v.id) ?? [];
              const pos = posByVendor.get(v.id) ?? [];
              return (
                <tr key={v.id} className="text-sm hover:bg-white/40">
                  <td className="px-6 py-3 font-medium text-gray-900"><Link to={`/vendors/${v.id}`} className="hover:underline">{v.name}</Link></td>
                  <td className="px-6 py-3 text-gray-600">{v.type === 'individual' ? '個人' : '法人'}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{v.invoiceRegistrationNumber || '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{v.withholding ? '対象' : '—'}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{assignments.length}</td>
                  <td className="px-6 py-3 text-right tabular-nums">¥{formatYen(sumBy(assignments, a => a.amount))}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{pos.length}件</td>
                  <td className="px-6 py-3 text-right whitespace-nowrap">
                    {canWrite && <button onClick={() => setForm({ vendor: v })} className="text-indigo-600 hover:text-indigo-900">編集</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {unregisteredGroups.length > 0 && (
        <section className="mx-0 mt-6 bg-white/50 sm:mx-4 sm:rounded-xl border-y sm:border border-white/40">
          <h3 className="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b text-earth-800 border-white/40">
            <AlertTriangle size={16} className="text-amber-500" />
            外注先マスタに未登録の名前 ({unregisteredGroups.length}件)
          </h3>
          <p className="px-4 pt-3 text-xs text-earth-600">
            過去の内訳に入力された名前です。登録するか既存の外注先に紐付けると、外注先ごとの集計にまとまります (空白・全角半角・丸数字の違いは自動でまとめています)。
          </p>
          <ul className="divide-y divide-white/40">
            {unregisteredGroups.map(group => (
              <li key={group.key} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-earth-900">{group.variants.map(([name]) => name).join(' / ')}</p>
                  <p className="text-xs text-earth-600">{group.count}件 ・ ¥{formatYen(group.amount)}</p>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setForm({ vendor: null, initial: { name: group.variants[0][0], aliases: group.variants.slice(1).map(([n]) => n) } })}
                      className="px-3 py-1.5 text-xs font-medium text-white rounded-md bg-earth-600 hover:bg-earth-700">新規登録</button>
                    {vendors.length > 0 && (
                      <>
                        <select value={linkTargets[group.key] ?? ''} onChange={e => setLinkTargets(prev => ({ ...prev, [group.key]: e.target.value }))} className="py-1 text-xs border-gray-300 rounded-md">
                          <option value="">既存の外注先を選択</option>
                          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <button disabled={!linkTargets[group.key]} onClick={() => linkToVendor(group.key, group.variants.map(([n]) => n))}
                          className="px-3 py-1.5 text-xs font-medium bg-white border rounded-md text-earth-800 border-earth-300 hover:bg-earth-50 disabled:opacity-40">紐付け</button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {form && (
        <VendorForm editingVendor={form.vendor} initial={form.initial} onClose={() => setForm(null)} />
      )}
    </div>
  );
};

export default VendorPage;
