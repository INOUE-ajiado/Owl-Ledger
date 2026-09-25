import { useRef, useState } from 'react';
import { FileText, Paperclip, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import type { LedgerReport, LedgerEntry } from '../../types';
import { formatYen, sumEntries } from './page/ledgerUtils';

interface LedgerListProps {
  report: LedgerReport;
  onAttachFile: (entryId: string, file: File) => void;
  isLocked: boolean;
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (entryId: string) => void;
  editingEntryId?: string;
}

const subjectText = (entry: LedgerEntry) =>
  Array.isArray(entry.subject) ? entry.subject.join('\n') : entry.subject;

const formatDate = (date: string) => {
  const [, m, d] = date.split('-');
  return m && d ? `${Number(m)}/${Number(d)}` : date;
};

const actionButton = "p-1.5 rounded-md transition-colors";

const LedgerList = ({ report, onAttachFile, isLocked, onEdit, onDelete, editingEntryId }: LedgerListProps) => {
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

  const { income: totalIncome, expense: totalExpense } = sumEntries(report);
  const sortedEntries = [...report.entries].sort((a, b) => a.date.localeCompare(b.date));

  const renderActions = (entry: LedgerEntry) => (
    <div className="flex items-center justify-end gap-0.5">
      {entry.receiptImageUrl && (
        <a href={entry.receiptImageUrl} target="_blank" rel="noopener noreferrer" className={`${actionButton} text-blue-600 hover:bg-blue-50`} title="添付ファイルを表示">
          <FileText size={16} />
        </a>
      )}
      {!isLocked && (
        <>
          <button onClick={() => handleAttachClick(entry.id)} className={`${actionButton} text-green-700 hover:bg-green-50`} title={entry.receiptImageUrl ? '添付ファイルを変更' : 'ファイルを添付'}>
            {entry.receiptImageUrl ? <RefreshCw size={16} /> : <Paperclip size={16} />}
          </button>
          <button onClick={() => onEdit(entry)} className={`${actionButton} text-indigo-600 hover:bg-indigo-50`} title="編集">
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(entry.id)} className={`${actionButton} text-red-600 hover:bg-red-50`} title="削除">
            <Trash2 size={16} />
          </button>
        </>
      )}
    </div>
  );

  const fileInput = (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileSelected}
      className="hidden"
      accept="image/jpeg,image/png,image/heic,application/pdf"
    />
  );

  if (sortedEntries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-earth-500">
        {fileInput}
        この月の明細はまだ登録されていません。
      </div>
    );
  }

  return (
    <div>
      {fileInput}

      {/* PC / タブレット: テーブル表示 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-earth-50/90 text-xs text-earth-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">日付</th>
              <th className="px-3 py-2 text-left font-medium">科目</th>
              <th className="px-3 py-2 text-left font-medium">内容</th>
              <th className="px-3 py-2 text-left font-medium">支払い先</th>
              <th className="px-3 py-2 text-right font-medium whitespace-nowrap">入金</th>
              <th className="px-3 py-2 text-right font-medium whitespace-nowrap">出金</th>
              <th className="px-3 py-2 text-right font-medium"><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody className="bg-white/80 divide-y divide-gray-100">
            {sortedEntries.map(entry => (
              <tr key={entry.id} className={`transition-colors ${entry.id === editingEntryId ? 'bg-indigo-50' : 'hover:bg-earth-50/60'}`}>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-earth-700" title={entry.date}>{formatDate(entry.date)}</td>
                <td className="px-3 py-2 whitespace-pre-line text-earth-800">{subjectText(entry)}</td>
                <td className="px-3 py-2 whitespace-pre-line">{entry.description}</td>
                <td className="px-3 py-2 text-earth-700">{entry.payee}</td>
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-blue-700">{entry.income > 0 ? entry.income.toLocaleString() : ''}</td>
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-red-700">{entry.expense > 0 ? entry.expense.toLocaleString() : ''}</td>
                <td className="px-2 py-1 whitespace-nowrap">{renderActions(entry)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-earth-50/90 font-semibold border-t-2 border-earth-200">
            <tr>
              <td colSpan={4} className="px-3 py-2 text-right text-earth-700">合計</td>
              <td className="px-3 py-2 text-right tabular-nums text-blue-700">{totalIncome.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-red-700">{totalExpense.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* スマホ: カード表示 */}
      <ul className="md:hidden divide-y divide-gray-100 bg-white/80">
        {sortedEntries.map(entry => (
          <li key={entry.id} className={`px-4 py-3 ${entry.id === editingEntryId ? 'bg-indigo-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-earth-500 tabular-nums">
                  {formatDate(entry.date)}
                  <span className="ml-2 text-earth-700">{subjectText(entry).replace(/\n/g, ' / ')}</span>
                </p>
                <p className="mt-0.5 text-sm text-earth-900 whitespace-pre-line break-words">{entry.description}</p>
                {entry.payee && <p className="text-xs text-earth-500 truncate">{entry.payee}</p>}
              </div>
              <div className="text-right flex-shrink-0 tabular-nums">
                {entry.income > 0 && <p className="text-sm font-semibold text-blue-700">+{formatYen(entry.income)}</p>}
                {entry.expense > 0 && <p className="text-sm font-semibold text-red-700">−{formatYen(entry.expense)}</p>}
              </div>
            </div>
            <div className="mt-1 -mr-1.5">{renderActions(entry)}</div>
          </li>
        ))}
        <li className="flex justify-between px-4 py-2 text-sm font-semibold bg-earth-50/90 tabular-nums">
          <span className="text-earth-700">合計</span>
          <span>
            <span className="text-blue-700">{formatYen(totalIncome)}</span>
            <span className="mx-2 text-earth-400">/</span>
            <span className="text-red-700">{formatYen(totalExpense)}</span>
          </span>
        </li>
      </ul>
    </div>
  );
};

export default LedgerList;
