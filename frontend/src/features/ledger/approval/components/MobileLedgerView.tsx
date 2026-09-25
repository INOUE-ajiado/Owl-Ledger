import { CheckCircle, Receipt } from 'lucide-react';
import ApprovalStamp from '../../ApprovalStamp';
import type { LedgerEntry, LedgerReport } from '../../../../types';
import { formatStampDate } from '../utils';

interface MobileLedgerViewProps {
  report: LedgerReport;
  onApprove: () => void;
  onSelectEntry: (entry: LedgerEntry) => void;
}

const getStatusBadgeStyle = (status: LedgerReport['status']) => {
  switch (status) {
    case '承認待ち': return 'bg-yellow-100 text-yellow-800';
    case '承認済み': return 'bg-green-100 text-green-800';
    case '経理提出済み': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// 出納帳プレビューのスマホ専用画面 (sm 未満でのみ表示)
export const MobileLedgerView = ({ report, onApprove, onSelectEntry }: MobileLedgerViewProps) => {
  const sortedEntries = [...report.entries].sort((a, b) => a.date.localeCompare(b.date));
  const totalIncome = report.entries.reduce((sum, e) => sum + (e.income || 0), 0);
  const totalExpense = report.entries.reduce((sum, e) => sum + (e.expense || 0), 0);
  let runningBalance = 0;

  return (
    <div className="min-h-screen bg-white sm:hidden no-print">
      <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 bg-[#1e293b] text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">ステータス</span>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusBadgeStyle(report.status)}`}>
            {report.status}
          </span>
        </div>
        {report.status === '承認待ち' && (
          <button
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-black text-white transition-all border rounded-lg shadow-lg bg-emerald-500 border-emerald-400 active:bg-emerald-600 active:scale-95"
          >
            <CheckCircle size={18} />
            <span>承認する</span>
          </button>
        )}
      </header>

      <div className="flex items-end justify-between px-4 pt-3 pb-2 border-b border-gray-200">
        <h1 className="text-lg font-bold">出納帳</h1>
        <div className="text-[11px] text-right text-gray-600">
          <p>No. {report.reportNumber}</p>
          <p>期間: {report.month}</p>
        </div>
      </div>

      <ul className="divide-y divide-gray-200">
        {sortedEntries.map(entry => {
          runningBalance += (entry.income || 0) - (entry.expense || 0);
          const hasReceipt = !!entry.receiptImageUrl;
          const subjects = Array.isArray(entry.subject) ? entry.subject : [entry.subject as string];
          return (
            <li
              key={entry.id}
              className={`px-4 py-3 ${hasReceipt ? 'cursor-pointer active:bg-blue-50' : ''}`}
              onClick={() => hasReceipt && onSelectEntry(entry)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center min-w-0 gap-1.5">
                  <span className="text-xs font-medium text-gray-500 tabular-nums">{entry.date.replace(/-/g, '/')}</span>
                  {subjects.filter(Boolean).map(s => (
                    <span key={s} className="px-1.5 py-0.5 text-[10px] font-medium text-gray-700 bg-gray-100 rounded">{s}</span>
                  ))}
                </div>
                <div className="flex-shrink-0 text-sm font-bold text-right tabular-nums">
                  {(entry.income || 0) > 0 && <p className="text-blue-700">+¥{entry.income.toLocaleString()}</p>}
                  {(entry.expense || 0) > 0 && <p className="text-red-600">−¥{entry.expense.toLocaleString()}</p>}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-900 break-words whitespace-pre-line">{entry.description}</p>
              <div className="flex items-end justify-between gap-3 mt-1">
                <p className="min-w-0 text-xs text-gray-500 break-words">{entry.payee}</p>
                <div className="flex items-center flex-shrink-0 gap-2">
                  {hasReceipt && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-blue-600">
                      <Receipt size={12} />レシート
                    </span>
                  )}
                  <span className="text-[11px] text-gray-500 tabular-nums">残高 ¥{runningBalance.toLocaleString()}</span>
                </div>
              </div>
            </li>
          );
        })}
        {sortedEntries.length === 0 && (
          <li className="px-4 py-10 text-sm text-center text-gray-400">明細がありません</li>
        )}
      </ul>

      <dl className="grid grid-cols-3 text-center border-y-2 border-gray-300 bg-gray-50">
        <div className="py-2">
          <dt className="text-[10px] text-gray-500">入金合計</dt>
          <dd className="text-sm font-bold tabular-nums">¥{totalIncome.toLocaleString()}</dd>
        </div>
        <div className="py-2 border-x border-gray-200">
          <dt className="text-[10px] text-gray-500">出金合計</dt>
          <dd className="text-sm font-bold text-red-600 tabular-nums">¥{totalExpense.toLocaleString()}</dd>
        </div>
        <div className="py-2">
          <dt className="text-[10px] text-gray-500">残高</dt>
          <dd className="text-sm font-bold tabular-nums">¥{runningBalance.toLocaleString()}</dd>
        </div>
      </dl>

      <footer className="flex justify-end gap-2 px-4 py-6">
        <div className="flex flex-col items-center">
          <span className="mb-1 text-[10px]">担当</span>
          <div className="flex items-center justify-center w-20 h-20 border border-gray-400 rounded-sm">
            {report.submittedAt && report.submitterName && (
              <ApprovalStamp status="提出" name={report.submitterName} date={formatStampDate(report.submittedAt)} />
            )}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="mb-1 text-[10px]">承認</span>
          <div className="flex items-center justify-center w-20 h-20 border border-gray-400 rounded-sm">
            {report.approvedAt && report.approverName && (
              <ApprovalStamp status="承認" name={report.approverName} date={formatStampDate(report.approvedAt)} />
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
