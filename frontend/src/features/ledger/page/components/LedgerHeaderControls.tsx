import type { LedgerReport } from '../../../../types';

interface LedgerHeaderControlsProps {
  currentMonth: string;
  onChangeMonth: (amount: number) => void;
  currentReport: LedgerReport | null;
  onDeleteReport: () => void;
  onSubmitForApproval: () => void;
  canWrite: boolean;
}

export const LedgerHeaderControls = ({
  currentMonth,
  onChangeMonth,
  currentReport,
  onDeleteReport,
  onSubmitForApproval,
  canWrite
}: LedgerHeaderControlsProps) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center">
        <button onClick={() => onChangeMonth(-1)} className="px-3 py-1 text-earth-700 bg-white/40 border border-white/30 rounded hover:bg-white/60 transition-colors">&lt;</button>
        <h3 className="mx-4 text-lg font-bold text-earth-800">{currentMonth}</h3>
        <button onClick={() => onChangeMonth(1)} className="px-3 py-1 text-earth-700 bg-white/40 border border-white/30 rounded hover:bg-white/60 transition-colors">&gt;</button>
      </div>
      {currentReport && currentReport.status === '作成中' && canWrite && (
        <div className="flex items-center space-x-3">
          <button
            onClick={onDeleteReport}
            className="px-4 py-2 text-sm font-medium text-white bg-[#BF6A5D] rounded-md hover:bg-[#a65d51] shadow-md transition-all"
          >
            この下書きを削除
          </button>
          <button
            onClick={onSubmitForApproval}
            className="px-4 py-2 text-sm font-medium text-white bg-[#8B9A8B] rounded-md hover:bg-[#7a887a] shadow-md transition-all"
          >
            この月を提出
          </button>
        </div>
      )}
    </div>
  );
};