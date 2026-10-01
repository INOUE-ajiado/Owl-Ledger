import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Link2, Send, Trash2 } from 'lucide-react';
import type { LedgerReport } from '../../../../types';
import { STATUS_STYLES, formatYen, sumEntries } from '../ledgerUtils';

interface ProcessedReportsListProps {
  reports: LedgerReport[];
  canWrite: boolean;
  isMasterUser: boolean;
  onShowApprovalLink: (id: string) => void;
  onSubmitToAccounting: (id: string) => void;
  onCopyUrl: (id: string) => void;
  onDeleteReport: (report: LedgerReport) => void;
}

const iconButton = "p-2 text-earth-600 rounded-md hover:bg-white transition-colors";

export const ProcessedReportsList = ({
  reports, canWrite, isMasterUser,
  onShowApprovalLink, onSubmitToAccounting, onCopyUrl, onDeleteReport
}: ProcessedReportsListProps) => {
  if (reports.length === 0) return null;

  return (
    <section>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {reports.map(report => {
          const { income, expense } = sumEntries(report);
          return (
            <li key={report.id} className="flex flex-col gap-2 p-3 bg-white/70 border border-white/40 rounded-lg shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-earth-900 whitespace-nowrap">No.{report.reportNumber}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[report.status].badge}`}>
                    {report.status}
                  </span>
                </div>
                <div className="flex items-center">
                  <button onClick={() => onCopyUrl(report.id)} className={iconButton} title="URLコピー">
                    <Copy size={16} />
                  </button>
                  {/* 承認済み・経理提出済みは保存義務があるため削除不可 */}
                  {(isMasterUser || canWrite) && report.status === '承認待ち' && (
                    <button onClick={() => onDeleteReport(report)} className={`${iconButton} hover:text-red-600`} title="削除">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-earth-600 tabular-nums">
                {report.entries.length}件 ・ 入金 {formatYen(income)} ・ 出金 {formatYen(expense)}
              </p>

              <div className="flex gap-2">
                <Link
                  to={`/approval/${report.id}`}
                  target="_blank"
                  className="flex items-center justify-center flex-1 gap-1.5 px-3 py-1.5 text-sm font-medium text-earth-800 bg-white border border-earth-200 rounded-md hover:bg-earth-50 transition-colors"
                >
                  <ExternalLink size={14} />
                  開く
                </Link>
                {report.status === '承認待ち' && canWrite && (
                  <button onClick={() => onShowApprovalLink(report.id)} className="flex items-center justify-center flex-1 gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors">
                    <Link2 size={14} />
                    URL再表示
                  </button>
                )}
                {report.status === '承認済み' && canWrite && (
                  <button onClick={() => onSubmitToAccounting(report.id)} className="flex items-center justify-center flex-1 gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-purple-500 rounded-md hover:bg-purple-600 transition-colors">
                    <Send size={14} />
                    経理へ提出
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
