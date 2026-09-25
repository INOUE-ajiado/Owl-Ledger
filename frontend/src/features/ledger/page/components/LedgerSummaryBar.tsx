import { Send, Trash2 } from 'lucide-react';
import type { LedgerReport } from '../../../../types';
import { STATUS_STYLES, formatMonthLabel, formatYen, sumEntries } from '../ledgerUtils';

interface LedgerSummaryBarProps {
  currentMonth: string;
  currentReport: LedgerReport | null;
  onDeleteReport: () => void;
  onSubmitForApproval: () => void;
  canWrite: boolean;
}

const Stat = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => (
  <div className="min-w-0">
    <p className="text-[11px] text-earth-500">{label}</p>
    <p className={`text-base sm:text-lg font-bold tabular-nums truncate ${className}`}>{value}</p>
  </div>
);

export const LedgerSummaryBar = ({
  currentMonth,
  currentReport,
  onDeleteReport,
  onSubmitForApproval,
  canWrite
}: LedgerSummaryBarProps) => {
  const totals = currentReport ? sumEntries(currentReport) : null;

  return (
    <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between border-t border-white/30">
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-xl font-bold text-earth-900 whitespace-nowrap">{formatMonthLabel(currentMonth)}</h2>
        {currentReport && (
          <>
            <span className="text-sm text-earth-600 whitespace-nowrap">No.{currentReport.reportNumber}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[currentReport.status].badge}`}>
              {currentReport.status}
            </span>
          </>
        )}
      </div>

      {totals && currentReport && (
        <div className="grid grid-cols-4 gap-4 lg:gap-8 lg:flex-1 lg:max-w-xl">
          <Stat label="件数" value={`${currentReport.entries.length}件`} className="text-earth-800" />
          <Stat label="入金" value={formatYen(totals.income)} className="text-blue-700" />
          <Stat label="出金" value={formatYen(totals.expense)} className="text-red-700" />
          <Stat label="差引" value={formatYen(totals.balance)} className={totals.balance < 0 ? 'text-red-700' : 'text-earth-900'} />
        </div>
      )}

      {currentReport && currentReport.status === '作成中' && canWrite && (
        <div className="flex items-center gap-2">
          <button
            onClick={onDeleteReport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#BF6A5D] bg-white/60 border border-[#BF6A5D]/30 rounded-md hover:bg-[#BF6A5D] hover:text-white transition-all"
          >
            <Trash2 size={15} />
            下書きを削除
          </button>
          <button
            onClick={onSubmitForApproval}
            className="flex flex-1 lg:flex-none items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#8B9A8B] rounded-md hover:bg-[#7a887a] shadow-md transition-all"
          >
            <Send size={15} />
            この月を提出
          </button>
        </div>
      )}
    </div>
  );
};
