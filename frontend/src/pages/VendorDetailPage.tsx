import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteDoc, doc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { db } from '../api/firebase';
import { useAppOutletContext, useModal } from '../contexts';
import { useVendors } from '../hooks/useMasters';
import { useProjects, usePurchaseOrders } from '../hooks/useProjectData';
import { recordChange } from '../api/changeHistory';
import VendorForm from '../features/vendors/VendorForm';
import { collectAssignments, groupPurchaseOrders, sumBy } from '../features/vendors/vendorStats';
import { InfoRow, Panel, StatCard, StatusBadge } from '../components/DetailParts';
import { formatYen, formatYmdSlash } from '../utils/money';

const poDate = (po: { issueDate?: string; issuedAt: { seconds: number } }) => po.issueDate || formatYmdSlash(new Date(po.issuedAt.seconds * 1000));

const VendorDetailPage = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const { setHeaderProps, permissions } = useAppOutletContext();
  const { showModal } = useModal();
  const canWrite = permissions?.isAdmin === true || permissions?.permissions?.clients === 'write';
  const { vendors, vendorIndex, loading } = useVendors();
  const { projects } = useProjects();
  const { purchaseOrders } = usePurchaseOrders();
  const [isEditing, setIsEditing] = useState(false);

  const vendor = vendors.find(v => v.id === vendorId);
  const projectsById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const assignments = useMemo(() => (vendor ? collectAssignments(projects, vendorIndex).byVendor.get(vendor.id) ?? [] : [])
    .sort((a, b) => (b.project.registrationDate || '').localeCompare(a.project.registrationDate || '')), [projects, vendorIndex, vendor]);
  const pos = useMemo(() => (vendor ? groupPurchaseOrders(purchaseOrders, vendorIndex).get(vendor.id) ?? [] : [])
    .sort((a, b) => b.issuedAt.seconds - a.issuedAt.seconds), [purchaseOrders, vendorIndex, vendor]);

  // 年別 (発注日ベース) の発注額・源泉徴収額
  const yearly = useMemo(() => {
    const map = new Map<string, { amount: number; withholding: number; payment: number; count: number }>();
    pos.forEach(po => {
      const year = poDate(po).slice(0, 4);
      const row = map.get(year) ?? { amount: 0, withholding: 0, payment: 0, count: 0 };
      row.amount += po.amount || 0;
      row.withholding += po.withholdingTax || 0;
      row.payment += po.paymentAmount ?? po.amount ?? 0;
      row.count += 1;
      map.set(year, row);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [pos]);

  useEffect(() => {
    setHeaderProps({ title: vendor ? vendor.name : '外注先', actions: undefined });
  }, [setHeaderProps, vendor]);

  const handleDelete = () => {
    if (!vendor) return;
    showModal({
      title: '外注先の削除',
      message: `${vendor.name} を外注先マスタから削除しますか？\n過去のプロジェクト・発注書の名前はそのまま残ります。`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'vendors', vendor.id));
          const { id: _id, ...before } = vendor; // eslint-disable-line @typescript-eslint/no-unused-vars
          await recordChange({ targetType: 'vendor', targetId: vendor.id, targetLabel: vendor.name, action: 'delete', before, after: null });
          navigate('/vendors');
        } catch (error) {
          console.error('外注先の削除に失敗しました:', error);
          showModal({ title: 'エラー', message: '削除に失敗しました。' });
        }
      },
    });
  };

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;
  if (!vendor) return <div className="p-10 text-center text-gray-500">外注先が見つかりません。<Link to="/vendors" className="ml-2 underline">一覧へ戻る</Link></div>;

  return (
    <div className="w-full min-h-full pb-10 space-y-4 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 sm:px-0 sm:pt-0">
        <Link to="/vendors" className="inline-flex items-center gap-1 text-sm text-earth-700 hover:underline"><ArrowLeft size={16} />外注先一覧</Link>
        {canWrite && (
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 text-sm text-white rounded-md bg-earth-600 hover:bg-earth-700">編集</button>
            <button onClick={handleDelete} className="px-4 py-1.5 text-sm text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50">削除</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px lg:grid-cols-4 sm:gap-3">
        <StatCard label="担当件数" value={`${assignments.length}件`} />
        <StatCard label="配分額合計 (内訳)" value={`¥${formatYen(sumBy(assignments, a => a.amount))}`} />
        <StatCard label="発注額合計 (税抜)" value={`¥${formatYen(sumBy(pos, po => po.amount))}`} sub={`${pos.length}件`} />
        <StatCard label="源泉徴収税額合計" value={`¥${formatYen(sumBy(pos, po => po.withholdingTax ?? 0))}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Panel title="基本情報">
          <dl className="divide-y divide-white/40">
            <InfoRow label="区分" value={vendor.type === 'individual' ? '個人' : '法人'} />
            <InfoRow label="読み仮名" value={vendor.kana} />
            <InfoRow label="インボイス登録番号" value={vendor.invoiceRegistrationNumber} />
            <InfoRow label="源泉徴収" value={vendor.withholding ? '対象' : '対象外'} />
            <InfoRow label="メール" value={vendor.email} />
            <InfoRow label="電話" value={vendor.tel} />
            <InfoRow label="住所" value={[vendor.postalCode && `〒${vendor.postalCode}`, vendor.address].filter(Boolean).join(' ')} />
            <InfoRow label="振込先" value={[vendor.bankName, vendor.branchName, vendor.accountType, vendor.accountNumber, vendor.accountHolder].filter(Boolean).join(' ')} />
            <InfoRow label="別表記" value={(vendor.aliases ?? []).join(' / ')} />
            <InfoRow label="備考" value={vendor.remarks} />
          </dl>
        </Panel>

        <div className="space-y-4">
          <Panel title="年別の支払額">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-left text-earth-500"><tr><th className="px-4 py-2">年</th><th className="px-4 py-2 text-right">件数</th><th className="px-4 py-2 text-right">発注額 (税抜)</th><th className="px-4 py-2 text-right">源泉徴収税額</th><th className="px-4 py-2 text-right">差引支払額</th></tr></thead>
                <tbody className="divide-y divide-white/40">
                  {yearly.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-earth-500">発注書はまだありません。</td></tr>}
                  {yearly.map(([year, row]) => (
                    <tr key={year} className="tabular-nums">
                      <td className="px-4 py-2">{year}年</td>
                      <td className="px-4 py-2 text-right">{row.count}</td>
                      <td className="px-4 py-2 text-right">¥{formatYen(row.amount)}</td>
                      <td className="px-4 py-2 text-right">¥{formatYen(row.withholding)}</td>
                      <td className="px-4 py-2 text-right">¥{formatYen(row.payment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`発注履歴 (${pos.length}件)`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-left text-earth-500"><tr><th className="px-4 py-2">発注日</th><th className="px-4 py-2">発注No.</th><th className="px-4 py-2">プロジェクト</th><th className="px-4 py-2 text-right">金額 (税抜)</th><th className="px-4 py-2 text-right">源泉</th><th className="px-4 py-2"></th></tr></thead>
                <tbody className="divide-y divide-white/40">
                  {pos.map(po => {
                    const project = projectsById.get(po.projectDocId);
                    return (
                      <tr key={`${po.projectDocId}/${po.id}`} className="tabular-nums">
                        <td className="px-4 py-2 whitespace-nowrap">{poDate(po)}</td>
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{po.poNumber ?? (project ? `${project.projectId}-PO` : '—')}</td>
                        <td className="px-4 py-2">{project ? <Link to={`/projects/${project.id}`} className="hover:underline">{project.title}</Link> : '(削除済み)'}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">¥{formatYen(po.amount)}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">{po.withholdingTax ? `¥${formatYen(po.withholdingTax)}` : '—'}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap"><a href={`/print/purchase-order/${po.projectDocId}?poId=${po.id}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">表示</a></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`担当した案件 (${assignments.length}件)`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-left text-earth-500"><tr><th className="px-4 py-2">受注日</th><th className="px-4 py-2">プロジェクト</th><th className="px-4 py-2">内容</th><th className="px-4 py-2 text-right">配分額</th><th className="px-4 py-2">状態</th></tr></thead>
                <tbody className="divide-y divide-white/40">
                  {assignments.map(a => (
                    <tr key={`${a.project.id}-${a.itemIndex}`}>
                      <td className="px-4 py-2 whitespace-nowrap tabular-nums">{a.project.registrationDate}</td>
                      <td className="px-4 py-2"><Link to={`/projects/${a.project.id}`} className="hover:underline">{a.project.title}</Link></td>
                      <td className="px-4 py-2 text-earth-600">{a.content}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap tabular-nums">¥{formatYen(a.amount)}</td>
                      <td className="px-4 py-2"><StatusBadge status={a.project.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      {isEditing && <VendorForm editingVendor={vendor} onClose={() => setIsEditing(false)} />}
    </div>
  );
};

export default VendorDetailPage;
