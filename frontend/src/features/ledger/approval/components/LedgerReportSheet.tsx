import ApprovalStamp from '../../ApprovalStamp';
import type { LedgerReport } from '../../../../types';

interface LedgerReportSheetProps {
  report: LedgerReport;
  onSelectReceipt: (url: string | null) => void;
}

const formatStampDate = (timestamp: { seconds: number; nanoseconds: number; } | undefined) => {
  if (!timestamp) return '';
  const date = new Date(timestamp.seconds * 1000);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  return `${Y}.${M}.${D}`;
};

export const LedgerReportSheet = ({ report, onSelectReceipt }: LedgerReportSheetProps) => {
  let runningBalance = 0;
  const totalIncome = report.entries.reduce((sum, e) => sum + (e.income || 0), 0);
  const totalExpense = report.entries.reduce((sum, e) => sum + (e.expense || 0), 0);

  const sortedEntries = [...report.entries].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div
      className="p-4 mx-auto bg-white shadow-lg sm:p-8 printable-area"
      style={{ width: '210mm', minHeight: '297mm' }}
    >
      <main>
        <header className="flex items-end justify-between mb-4">
          <h1 className="text-2xl font-bold sm:text-3xl">出納帳</h1>
          <div className="text-[10px] sm:text-sm text-right">
            <p>No. {report.reportNumber}</p>
            <p>期間: {report.month}</p>
          </div>
        </header>

        <div className="w-full mb-4 overflow-x-auto border border-gray-300 rounded-sm table-container">
          <table className="w-full text-[10px] sm:text-xs border-collapse table-fixed min-w-[700px]">
            <thead className="font-semibold text-center bg-gray-100">
              <tr className="border-b border-gray-300 divide-x divide-gray-300">
                <td className="p-1 w-[8%]">日付</td>
                <td className="p-1 w-[12%]">科目</td>
                <td className="p-1 w-[30%]">内容</td>
                <td className="p-1 w-[20%]">支払い先</td>
                <td className="p-1 w-[8%] text-right">入金 (¥)</td>
                <td className="p-1 w-[8%] text-right">出金 (¥)</td>
                <td className="p-1 w-[8%] text-right">残高 (¥)</td>
                <td className="p-1 w-[6%] text-center">RC</td>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedEntries.map(entry => {
                runningBalance += (entry.income || 0) - (entry.expense || 0);
                const hasReceipt = !!entry.receiptImageUrl;
                return (
                  <tr
                    key={entry.id}
                    className={`divide-x divide-gray-200 transition-colors ${hasReceipt ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => hasReceipt && onSelectReceipt(entry.receiptImageUrl ?? null)}
                  >
                    <td className="p-1 text-center break-words">{entry.date.replace(/-/g, '/')}</td>
                    <td className="p-1 break-words whitespace-pre-line">
                      {Array.isArray(entry.subject) ? entry.subject.join('\n') : (entry.subject as string)}
                    </td>
                    <td className="p-1 break-words whitespace-pre-line">{entry.description}</td>
                    <td className="p-1 break-words">{entry.payee}</td>
                    <td className="p-1 text-right tabular-nums">{(entry.income || 0) > 0 ? entry.income.toLocaleString() : ''}</td>
                    <td className="p-1 text-right text-red-600 tabular-nums">{(entry.expense || 0) > 0 ? entry.expense.toLocaleString() : ''}</td>
                    <td className="p-1 font-medium text-right tabular-nums">{runningBalance.toLocaleString()}</td>
                    <td className="p-1 text-center align-middle no-print">
                      {hasReceipt && (
                        <span className="font-bold text-blue-600">表示</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {Array.from({ length: Math.max(0, 15 - sortedEntries.length) }).map((_, i) => (
                <tr key={`blank-${i}`} className="h-8 divide-x divide-gray-200">
                  <td colSpan={8} className="p-1"></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-semibold bg-gray-100 border-t-2 border-gray-300">
              <tr className="divide-x divide-gray-300">
                <td className="p-1 text-center" colSpan={4}>合計</td>
                <td className="p-1 text-right tabular-nums">{totalIncome.toLocaleString()}</td>
                <td className="p-1 text-right text-red-600 tabular-nums">{totalExpense.toLocaleString()}</td>
                <td className="p-1 text-right tabular-nums">{runningBalance.toLocaleString()}</td>
                <td className="p-1"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <footer className="flex justify-end mt-8">
          <div className="flex space-x-2">
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[10px] sm:text-xs">担当</span>
              <div className="flex items-center justify-center w-16 h-16 border border-gray-400 rounded-sm sm:w-20 sm:h-20">
                {report.submittedAt && report.submitterName && (
                  <ApprovalStamp
                    status="提出"
                    name={report.submitterName}
                    date={formatStampDate(report.submittedAt)}
                  />
                )}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[10px] sm:text-xs">承認</span>
              <div className="flex items-center justify-center w-16 h-16 border border-gray-400 rounded-sm sm:w-20 sm:h-20">
                {report.approvedAt && report.approverName && (
                  <ApprovalStamp
                    status="承認"
                    name={report.approverName}
                    date={formatStampDate(report.approvedAt)}
                  />
                )}
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};