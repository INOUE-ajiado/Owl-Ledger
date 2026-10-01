import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { db } from '../api/firebase';
import { useAppOutletContext } from '../contexts';
import { useProjects } from '../hooks/useProjectData';
import { useCompanySettings } from '../hooks/useCompanySettings';
import ClientForm from '../features/clients/ClientForm';
import { InfoRow, Panel, StatCard, StatusBadge } from '../components/DetailParts';
import { formatYen, projectFinancials } from '../utils/money';
import { fiscalYearOf } from '../utils/period';
import type { Client } from '../types';

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { setHeaderProps, permissions } = useAppOutletContext();
  const canWrite = permissions?.isAdmin === true;
  const { settings } = useCompanySettings();
  const { projects, loading: projectsLoading } = useProjects();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    return onSnapshot(doc(db, 'clients', clientId), (snap) => {
      setClient(snap.exists() ? { id: snap.id, ...snap.data() } as Client : null);
      setLoading(false);
    }, () => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    setHeaderProps({ title: client ? client.name : 'クライアント', actions: undefined });
  }, [setHeaderProps, client]);

  // マスタープロジェクトは予算枠なので売上には含めない (子プロジェクトで計上)
  const rows = useMemo(() => projects
    .filter(p => p.clientId === clientId)
    .map(p => ({ project: p, fin: projectFinancials(p, settings.taxRate), fy: fiscalYearOf(p.registrationDate) }))
    .sort((a, b) => (b.project.registrationDate || '').localeCompare(a.project.registrationDate || '')), [projects, clientId, settings.taxRate]);
  const salesRows = rows.filter(r => r.project.projectType !== 'master');

  const totals = useMemo(() => {
    const currentFy = fiscalYearOf(new Date().toISOString().slice(0, 10));
    return {
      sales: salesRows.reduce((s, r) => s + r.fin.glossExclusive, 0),
      margin: salesRows.reduce((s, r) => s + r.fin.finalMargin, 0),
      thisFy: salesRows.filter(r => r.fy === currentFy).reduce((s, r) => s + r.fin.glossExclusive, 0),
      invoiced: salesRows.filter(r => r.project.isFixed).reduce((s, r) => s + (r.project.fixedInvoiceData?.total ?? 0), 0),
    };
  }, [salesRows]);

  const byFiscalYear = useMemo(() => {
    const map = new Map<number, { count: number; sales: number; margin: number }>();
    salesRows.forEach(r => {
      if (r.fy === null) return;
      const row = map.get(r.fy) ?? { count: 0, sales: 0, margin: 0 };
      row.count += 1;
      row.sales += r.fin.glossExclusive;
      row.margin += r.fin.finalMargin;
      map.set(r.fy, row);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [salesRows]);

  if (loading || projectsLoading) return <div className="p-10 text-center">読み込み中...</div>;
  if (!client) return <div className="p-10 text-center text-gray-500">クライアントが見つかりません。<Link to="/clients" className="ml-2 underline">一覧へ戻る</Link></div>;

  return (
    <div className="w-full min-h-full pb-10 space-y-4 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 sm:px-0 sm:pt-0">
        <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-earth-700 hover:underline"><ArrowLeft size={16} />クライアント一覧</Link>
        {canWrite && <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 text-sm text-white rounded-md bg-earth-600 hover:bg-earth-700">編集</button>}
      </div>

      <div className="grid grid-cols-2 gap-px lg:grid-cols-4 sm:gap-3">
        <StatCard label="累計売上 (税抜)" value={`¥${formatYen(totals.sales)}`} sub={`${salesRows.length}件`} />
        <StatCard label="今年度の売上 (税抜)" value={`¥${formatYen(totals.thisFy)}`} />
        <StatCard label="累計 MARGIN" value={`¥${formatYen(totals.margin)}`} sub={totals.sales > 0 ? `利益率 ${(totals.margin / totals.sales * 100).toFixed(1)}%` : undefined} />
        <StatCard label="請求確定額 (税込)" value={`¥${formatYen(totals.invoiced)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title="基本情報">
            <dl className="divide-y divide-white/40">
              <InfoRow label="クライアントID" value={client.clientCode} />
              <InfoRow label="略称" value={client.nameAbbr} />
              <InfoRow label="住所" value={[client.postalCode && `〒${client.postalCode}`, client.address, client.building].filter(Boolean).join(' ')} />
              <InfoRow label="事業部" value={client.department} />
              <InfoRow label="担当者" value={client.contactPerson} />
            </dl>
          </Panel>
          <Panel title="年度別の売上">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-left text-earth-500"><tr><th className="px-4 py-2">年度</th><th className="px-4 py-2 text-right">件数</th><th className="px-4 py-2 text-right">売上 (税抜)</th><th className="px-4 py-2 text-right">MARGIN</th></tr></thead>
              <tbody className="divide-y divide-white/40">
                {byFiscalYear.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-earth-500">取引はまだありません。</td></tr>}
                {byFiscalYear.map(([fy, row]) => (
                  <tr key={fy} className="tabular-nums">
                    <td className="px-4 py-2">{fy}年度</td>
                    <td className="px-4 py-2 text-right">{row.count}</td>
                    <td className="px-4 py-2 text-right">¥{formatYen(row.sales)}</td>
                    <td className="px-4 py-2 text-right">¥{formatYen(row.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <Panel title={`取引履歴 (${rows.length}件)`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-left text-earth-500">
                <tr><th className="px-4 py-2">受注日</th><th className="px-4 py-2">管理ID</th><th className="px-4 py-2">作品名</th><th className="px-4 py-2">版権担当者</th><th className="px-4 py-2 text-right">売上 (税抜)</th><th className="px-4 py-2">状態</th><th className="px-4 py-2">請求書番号</th></tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {rows.map(({ project, fin }) => (
                  <tr key={project.id} className="hover:bg-white/40">
                    <td className="px-4 py-2 whitespace-nowrap tabular-nums">{project.registrationDate}</td>
                    <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{project.projectId}</td>
                    <td className="px-4 py-2"><Link to={`/projects/${project.id}`} className="hover:underline">{project.title}</Link>{project.projectType === 'master' && <span className="ml-1 text-xs text-earth-500">(マスター)</span>}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{project.copyrightManager || '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap tabular-nums">{project.projectType === 'master' ? '—' : `¥${formatYen(fin.glossExclusive)}`}</td>
                    <td className="px-4 py-2"><StatusBadge status={project.status} /></td>
                    <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{project.isFixed ? (project.fixedInvoiceData?.invoiceNumber ?? project.projectId) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {isEditing && <ClientForm editingClient={client} onClose={() => setIsEditing(false)} />}
    </div>
  );
};

export default ClientDetailPage;
