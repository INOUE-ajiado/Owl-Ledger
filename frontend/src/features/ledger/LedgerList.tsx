import { useRef, useState } from 'react';
import type { LedgerReport, LedgerEntry } from '../../types';

interface LedgerListProps {
  report: LedgerReport;
  onAttachFile: (entryId: string, file: File) => void;
  isLocked: boolean;
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (entryId: string) => void;
}

const LedgerList = ({ report, onAttachFile, isLocked, onEdit, onDelete }: LedgerListProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetEntryId, setTargetEntryId] = useState<string | null>(null);

  const handleAttachClick = (entryId: string) => {
    setTargetEntryId(entryId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && targetEntryId) {
      onAttachFile(targetEntryId, file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const totalIncome = report.entries.reduce((sum, entry) => sum + (entry.income || 0), 0);
  const totalExpense = report.entries.reduce((sum, entry) => sum + (entry.expense || 0), 0);

  return (
    <div className="overflow-x-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        accept="image/jpeg,image/png,image/heic,application/pdf"
      />
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-500">日付</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">科目</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">内容</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">支払い先</th>
            <th className="px-4 py-2 text-right font-medium text-gray-500">入金 (¥)</th>
            <th className="px-4 py-2 text-right font-medium text-gray-500">出金 (¥)</th>
            <th className="px-4 py-2 text-center font-medium text-gray-500">ファイル操作</th>
            <th className="px-4 py-2 text-center font-medium text-gray-500">アクション</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {report.entries.length > 0 ? (
            [...report.entries]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(entry => (
              <tr key={entry.id}>
                <td className="px-4 py-2">{entry.date}</td>
                <td className="px-4 py-2 whitespace-pre-line">{Array.isArray(entry.subject) ? entry.subject.join('\n') : entry.subject}</td>
                <td className="px-4 py-2 whitespace-pre-line">{entry.description}</td>
                <td className="px-4 py-2">{entry.payee}</td>
                <td className="px-4 py-2 text-right">{entry.income > 0 ? entry.income.toLocaleString() : '-'}</td>
                <td className="px-4 py-2 text-right">{entry.expense > 0 ? entry.expense.toLocaleString() : '-'}</td>
                <td className="px-4 py-2 text-center">
                  {entry.receiptImageUrl ? (
                    <div className="flex flex-col items-center space-y-1">
                      <a href={entry.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">表示</a>
                      {!isLocked && (
                        <button onClick={() => handleAttachClick(entry.id)} className="text-green-600 hover:underline text-xs">変更</button>
                      )}
                    </div>
                  ) : (
                    !isLocked && (
                      <button onClick={() => handleAttachClick(entry.id)} className="text-blue-600 hover:underline text-xs">添付</button>
                    )
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  {!isLocked && (
                    <div className="flex justify-center space-x-2">
                      <button onClick={() => onEdit(entry)} className="text-indigo-600 hover:underline text-xs">編集</button>
                      <button onClick={() => onDelete(entry.id)} className="text-red-600 hover:underline text-xs">削除</button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="text-center py-10 text-gray-500">この月の明細はまだ登録されていません。</td>
            </tr>
          )}
        </tbody>
        {report.entries.length > 0 && (
          <tfoot className="bg-gray-50 font-semibold border-t-2 border-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-gray-700">現在の合計</td>
              <td className="px-4 py-2 text-right text-gray-900">{new Intl.NumberFormat('ja-JP').format(totalIncome)}</td>
              <td className="px-4 py-2 text-right text-gray-900">{new Intl.NumberFormat('ja-JP').format(totalExpense)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default LedgerList;