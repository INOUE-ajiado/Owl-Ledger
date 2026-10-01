import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Download, FileText, History, Search } from 'lucide-react';
import { db } from '../../../api/firebase';
import { useAppOutletContext, useAuth } from '../../../contexts';
import { useCollection } from '../../../hooks/useCollection';
import { isSafeReceiptUrl, toCsvCell } from '../../../utils/security';
import { normalizeName } from '../../../utils/names';
import { formatYen } from '../page/ledgerUtils';
import { ChangeHistoryModal } from '../../history/ChangeHistoryList';
import { retentionDeadline } from './retention';
import type { LedgerEntry, LedgerReport } from '../../../types';

type Row = { entry: LedgerEntry; report: LedgerReport; amount: number };

// 古いデータでは科目が配列ではなく文字列で保存されている
const subjectsOf = (entry: LedgerEntry): string[] =>
  Array.isArray(entry.subject) ? entry.subject : entry.subject ? [String(entry.subject)] : [];

const inputClass = 'block w-full mt-1 text-sm border-gray-300 rounded-md shadow-sm';

/**
 * 証憑検索 (電子帳簿保存法の検索要件: 取引年月日・取引金額・取引先で検索でき、範囲指定・組み合わせができる)
 */
const LedgerSearchPage = () => {
  const { setHeaderProps, permissions } = useAppOutletContext();
  const { user } = useAuth();
  const isAdmin = permissions?.isAdmin === true;
  const [reports, setReports] = useState<LedgerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { items: users } = useCollection<{ id: string; uid?: string }>('permissions', isAdmin);
  const [historyTarget, setHistoryTarget] = useState<LedgerReport | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [payee, setPayee] = useState('');
  const [keyword, setKeyword] = useState('');
  const [receipt, setReceipt] = useState<'all' | 'with' | 'without'>('all');
  const [owner, setOwner] = useState('');

  // 管理者は全員分、それ以外は自分の出納帳だけを対象にする
  useEffect(() => {
    if (!user) return;
    const q = isAdmin ? collection(db, 'ledgerReports') : query(collection(db, 'ledgerReports'), where('userId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as LedgerReport)));
      setLoading(false);
    }, (error) => {
      console.error('出納帳の読み込みに失敗しました:', error);
      setLoading(false);
    });
  }, [user, isAdmin]);

  const ownerEmail = useMemo(() => new Map(users.filter(u => u.uid).map(u => [u.uid as string, u.id])), [users]);

  const rows = useMemo(() => {
    const min = amountMin === '' ? null : Number(amountMin);
    const max = amountMax === '' ? null : Number(amountMax);
    const payeeKey = normalizeName(payee);
    const keywordKey = normalizeName(keyword);
    const result: Row[] = [];
    reports.forEach(report => {
      if (owner && report.userId !== owner) return;
      (report.entries ?? []).forEach(entry => {
        const amount = Math.max(Number(entry.income) || 0, Number(entry.expense) || 0);
        if (dateFrom && (entry.date || '') < dateFrom) return;
        if (dateTo && (entry.date || '') > dateTo) return;
        if (min !== null && amount < min) return;
        if (max !== null && amount > max) return;
        if (payeeKey && !normalizeName(entry.payee).includes(payeeKey)) return;
        if (keywordKey && !normalizeName(`${entry.description ?? ''} ${subjectsOf(entry).join(' ')}`).includes(keywordKey)) return;
        if (receipt === 'with' && !entry.receiptImageUrl) return;
        if (receipt === 'without' && entry.receiptImageUrl) return;
        result.push({ entry, report, amount });
      });
    });
    return result.sort((a, b) => (b.entry.date || '').localeCompare(a.entry.date || ''));
  }, [reports, dateFrom, dateTo, amountMin, amountMax, payee, keyword, receipt, owner]);

  const exportCsv = () => {
    const headers = ['取引日', '支払先・取引先', '科目', '内容', '入金', '出金', '証憑URL', '出納帳', '状態', '保存期限(目安)'];
    const lines = rows.map(({ entry, report }) => [
      entry.date, entry.payee, subjectsOf(entry).join(' / '), entry.description,
      Number(entry.income) || 0, Number(entry.expense) || 0, entry.receiptImageUrl ?? '',
      `${report.month} No.${report.reportNumber}`, report.status, retentionDeadline(entry.date || '') ?? '',
    ].map(toCsvCell).join(','));
    const blob = new Blob(['﻿' + [headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ledger_search_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  useEffect(() => {
    setHeaderProps({ title: '証憑検索', actions: undefined });
  }, [setHeaderProps]);

  const reset = () => {
    setDateFrom(''); setDateTo(''); setAmountMin(''); setAmountMax(''); setPayee(''); setKeyword(''); setReceipt('all'); setOwner('');
  };

  return (
    <div className="w-full min-h-full pb-10">
      <section className="p-4 border-b bg-white/50 backdrop-blur-sm border-white/30">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <label className="text-xs text-earth-700">取引日 (から)<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputClass} /></label>
          <label className="text-xs text-earth-700">取引日 (まで)<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputClass} /></label>
          <label className="text-xs text-earth-700">金額 (以上)<input type="number" min="0" value={amountMin} onChange={e => setAmountMin(e.target.value)} className={inputClass} /></label>
          <label className="text-xs text-earth-700">金額 (以下)<input type="number" min="0" value={amountMax} onChange={e => setAmountMax(e.target.value)} className={inputClass} /></label>
          <label className="col-span-2 text-xs text-earth-700">取引先<input value={payee} onChange={e => setPayee(e.target.value)} className={inputClass} placeholder="支払先・取引先の名前" /></label>
          <label className="text-xs text-earth-700">内容・科目<input value={keyword} onChange={e => setKeyword(e.target.value)} className={inputClass} /></label>
          <label className="text-xs text-earth-700">証憑
            <select value={receipt} onChange={e => setReceipt(e.target.value as typeof receipt)} className={inputClass}>
              <option value="all">すべて</option>
              <option value="with">添付あり</option>
              <option value="without">添付なし</option>
            </select>
          </label>
          {isAdmin && (
            <label className="col-span-2 text-xs text-earth-700">提出者
              <select value={owner} onChange={e => setOwner(e.target.value)} className={inputClass}>
                <option value="">全員</option>
                {users.filter(u => u.uid).map(u => <option key={u.id} value={u.uid}>{u.id}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <p className="flex items-center gap-1.5 text-sm text-earth-700"><Search size={16} />{loading ? '読み込み中...' : `${rows.length}件`}</p>
          <div className="flex gap-2">
            <button onClick={reset} className="px-3 py-1.5 text-sm bg-white border rounded-md border-earth-200 text-earth-800">条件をクリア</button>
            <button onClick={exportCsv} disabled={rows.length === 0} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white rounded-md bg-earth-500 hover:bg-earth-600 disabled:bg-earth-200"><Download size={14} />CSV</button>
          </div>
        </div>
      </section>

      {/* スマホ: カード表示 */}
      <ul className="divide-y md:hidden divide-white/40 bg-white/40">
        {rows.map(({ entry, report, amount }) => (
          <li key={`${report.id}-${entry.id}`} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-earth-900">{entry.payee || '(取引先なし)'}</p>
                <p className="text-xs text-earth-600">{entry.date} ・ {subjectsOf(entry).join(' / ')}</p>
                <p className="text-xs truncate text-earth-500">{entry.description}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold tabular-nums ${Number(entry.income) > 0 ? 'text-blue-700' : 'text-earth-900'}`}>{formatYen(amount)}</p>
                {isSafeReceiptUrl(entry.receiptImageUrl) && <a href={entry.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">証憑</a>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block bg-white/40">
        <table className="min-w-full text-sm divide-y divide-white/30">
          <thead className="text-xs text-left text-gray-500 bg-white/30">
            <tr>
              <th className="px-4 py-2">取引日</th><th className="px-4 py-2">取引先</th><th className="px-4 py-2">科目</th><th className="px-4 py-2">内容</th>
              <th className="px-4 py-2 text-right">入金</th><th className="px-4 py-2 text-right">出金</th><th className="px-4 py-2">証憑</th>
              <th className="px-4 py-2">出納帳</th><th className="px-4 py-2">保存期限 (目安)</th>{isAdmin && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/30">
            {!loading && rows.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-gray-500">条件に一致する明細はありません。</td></tr>}
            {rows.map(({ entry, report }) => (
              <tr key={`${report.id}-${entry.id}`} className="hover:bg-white/40">
                <td className="px-4 py-2 whitespace-nowrap tabular-nums">{entry.date}</td>
                <td className="px-4 py-2">{entry.payee}</td>
                <td className="px-4 py-2 text-xs text-earth-700">{subjectsOf(entry).join(' / ')}</td>
                <td className="px-4 py-2 text-earth-700">{entry.description}</td>
                <td className="px-4 py-2 text-right text-blue-700 whitespace-nowrap tabular-nums">{Number(entry.income) ? formatYen(Number(entry.income)) : ''}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap tabular-nums">{Number(entry.expense) ? formatYen(Number(entry.expense)) : ''}</td>
                <td className="px-4 py-2">
                  {isSafeReceiptUrl(entry.receiptImageUrl)
                    ? <a href={entry.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline"><FileText size={14} />表示</a>
                    : <span className="text-xs text-red-600">なし</span>}
                </td>
                <td className="px-4 py-2 text-xs whitespace-nowrap">
                  <Link to={`/approval/${report.id}`} target="_blank" className="hover:underline">{report.month} No.{report.reportNumber}</Link>
                  <span className="ml-1 text-earth-500">{report.status}</span>
                  {isAdmin && <span className="block text-earth-400">{ownerEmail.get(report.userId) ?? ''}</span>}
                </td>
                <td className="px-4 py-2 text-xs whitespace-nowrap tabular-nums text-earth-600">{retentionDeadline(entry.date || '')?.replace(/-/g, '/')}</td>
                {isAdmin && (
                  <td className="px-4 py-2">
                    <button onClick={() => setHistoryTarget(report)} className="inline-flex items-center gap-1 text-xs text-earth-700 hover:underline" title="訂正・削除の履歴"><History size={14} />履歴</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-4 mt-4 text-xs text-earth-500">
        承認済みの出納帳と添付ファイルは削除・変更できません。明細の訂正・削除は変更履歴に記録されます (管理者は「履歴」から確認できます)。
      </p>

      {historyTarget && (
        <ChangeHistoryModal targetId={historyTarget.id} title={`出納帳 ${historyTarget.month} No.${historyTarget.reportNumber}`} onClose={() => setHistoryTarget(null)} />
      )}
    </div>
  );
};

export default LedgerSearchPage;
