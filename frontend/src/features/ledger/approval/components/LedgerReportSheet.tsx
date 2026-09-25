import ApprovalStamp from '../../ApprovalStamp';
import type { LedgerReport } from '../../../../types';
import { formatStampDate } from '../utils';

interface LedgerReportSheetProps {
  report: LedgerReport;
  selectedReceiptUrl?: string | null;
  onSelectReceipt: (url: string | null) => void;
}

// 画面では余白を広めに、印刷時は従来どおりの詰めたレイアウトに戻す
const cell = 'px-2.5 py-2.5 print:p-1';

export const LedgerReportSheet = ({ report, selectedReceiptUrl, onSelectReceipt }: LedgerReportSheetProps) => {
  let runningBalance = 0;
  const totalIncome = report.entries.reduce((sum, e) => sum + (e.income || 0), 0);
  const totalExpense = report.entries.reduce((sum, e) => sum + (e.expense || 0), 0);
  const finalBalance = totalIncome - totalExpense;

  const sortedEntries = [...report.entries].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="w-full px-8 py-6 bg-white print:p-8 printable-area">
      <main>
        <header className="flex items-end justify-between pb-4 mb-5 border-b border-gray-200 print:pb-0 print:mb-4 print:border-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">出納帳</h1>
            <p className="mt-1 text-sm text-gray-500 print:hidden">No. {report.reportNumber}<span className="mx-2 text-gray-300">|</span>期間: {report.month}</p>
          </div>
          <div className="hidden text-sm text-right print:block">
            <p>No. {report.reportNumber}</p>
            <p>期間: {report.month}</p>
          </div>
          {/* 画面表示のみ: 合計のサマリー */}
          <dl className="flex gap-8 text-right print:hidden">
            <div>
              <dt className="text-xs text-gray-500">入金合計</dt>
              <dd className="text-lg font-bold text-gray-900 tabular-nums">¥{totalIncome.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">出金合計</dt>
              <dd className="text-lg font-bold text-red-600 tabular-nums">¥{totalExpense.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">残高</dt>
              <dd className={`text-lg font-bold tabular-nums ${finalBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>¥{finalBalance.toLocaleString()}</dd>
            </div>
          </dl>
        </header>

        <div className="w-full mb-4 overflow-x-auto border border-gray-200 rounded-lg print:border-gray-300 print:rounded-sm table-container">
          <table className="w-full text-sm leading-relaxed border-collapse table-fixed print:text-xs print:leading-normal">
            <thead className="text-xs font-semibold text-gray-600 bg-gray-50 print:text-black print:bg-gray-100">
              <tr className="border-b border-gray-200 divide-x divide-gray-200 print:border-gray-300 print:divide-gray-300">
                <td className={`${cell} w-[13%] print:w-[8%] text-center`}>日付</td>
                <td className={`${cell} w-[11%] print:w-[12%]`}>科目</td>
                <td className={`${cell} w-[25%] print:w-[30%]`}>内容</td>
                <td className={`${cell} w-[16%] print:w-[20%]`}>支払い先</td>
                <td className={`${cell} w-[9%] print:w-[8%] text-right`}>入金 (¥)</td>
                <td className={`${cell} w-[9%] print:w-[8%] text-right`}>出金 (¥)</td>
                <td className={`${cell} w-[9%] print:w-[8%] text-right`}>残高 (¥)</td>
                <td className={`${cell} w-[8%] print:w-[6%] text-center`}>RC</td>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-gray-200">
              {sortedEntries.map(entry => {
                runningBalance += (entry.income || 0) - (entry.expense || 0);
                const hasReceipt = !!entry.receiptImageUrl;
                const isSelected = hasReceipt && entry.receiptImageUrl === selectedReceiptUrl;
                return (
                  <tr
                    key={entry.id}
                    className={`divide-x divide-gray-100 print:divide-gray-200 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 print:bg-transparent'
                        : 'even:bg-gray-50/60 print:even:bg-transparent'
                    } ${hasReceipt ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => hasReceipt && onSelectReceipt(entry.receiptImageUrl ?? null)}
                  >
                    <td className={`${cell} text-center text-gray-700 tabular-nums whitespace-nowrap print:whitespace-normal print:break-words print:text-black`}>
                      {entry.date.replace(/-/g, '/')}
                    </td>
                    <td className={`${cell} break-words whitespace-pre-line`}>
                      {Array.isArray(entry.subject) ? entry.subject.join('\n') : (entry.subject as string)}
                    </td>
                    <td className={`${cell} break-words whitespace-pre-line text-gray-900`}>{entry.description}</td>
                    <td className={`${cell} break-words text-gray-700 print:text-black`}>{entry.payee}</td>
                    <td className={`${cell} text-right tabular-nums`}>{(entry.income || 0) > 0 ? entry.income.toLocaleString() : ''}</td>
                    <td className={`${cell} text-right text-red-600 tabular-nums`}>{(entry.expense || 0) > 0 ? entry.expense.toLocaleString() : ''}</td>
                    <td className={`${cell} font-medium text-right tabular-nums ${runningBalance < 0 ? 'text-red-600 print:text-black' : ''}`}>{runningBalance.toLocaleString()}</td>
                    <td className={`${cell} text-center align-middle no-print`}>
                      {hasReceipt && (
                        <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${
                          isSelected ? 'text-white bg-blue-600' : 'text-blue-700 bg-blue-100'
                        }`}>
                          表示
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedEntries.length === 0 && (
                <tr className="print:hidden">
                  <td colSpan={8} className="py-10 text-center text-gray-400">明細がありません</td>
                </tr>
              )}
              {/* 印刷時のみ: 用紙の体裁を保つための空行 */}
              {Array.from({ length: Math.max(0, 15 - sortedEntries.length) }).map((_, i) => (
                <tr key={`blank-${i}`} className="hidden h-8 divide-x divide-gray-200 print:table-row">
                  <td colSpan={8} className="p-1"></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-semibold bg-gray-50 border-t-2 border-gray-300 print:bg-gray-100">
              <tr className="divide-x divide-gray-200 print:divide-gray-300">
                <td className={`${cell} text-center`} colSpan={4}>合計</td>
                <td className={`${cell} text-right tabular-nums`}>{totalIncome.toLocaleString()}</td>
                <td className={`${cell} text-right text-red-600 tabular-nums`}>{totalExpense.toLocaleString()}</td>
                <td className={`${cell} text-right tabular-nums`}>{runningBalance.toLocaleString()}</td>
                <td className={cell}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <footer className="flex justify-end mt-8">
          <div className="flex space-x-2">
            <div className="flex flex-col items-center">
              <span className="mb-1 text-xs text-gray-600 print:text-black">担当</span>
              <div className="flex items-center justify-center w-20 h-20 border border-gray-300 rounded-sm print:border-gray-400">
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
              <span className="mb-1 text-xs text-gray-600 print:text-black">承認</span>
              <div className="flex items-center justify-center w-20 h-20 border border-gray-300 rounded-sm print:border-gray-400">
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
