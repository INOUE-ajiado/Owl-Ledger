import { useCallback } from 'react';
import type { LedgerReport } from '../../../../types';
import { useModal } from '../../../../contexts';
import { toCsvCell } from '../../../../utils/security';

export const useLedgerCSV = () => {
  const { showModal } = useModal();

  const exportCSV = useCallback((report: LedgerReport | null) => {
    if (!report) {
      showModal({ title: "エラー", message: "CSVを出力するレポートがありません。" });
      return;
    }
    const headers = ['日付', '科目', '内容', '支払い先', '入金(¥)', '出金(¥)', 'レシートURL'];
    const rows = report.entries.map(e => {
      // 数式として実行されないよう無害化してから出力する
      const escapeCSV = toCsvCell;
      return [
        escapeCSV(e.date), 
        escapeCSV(e.subject), 
        escapeCSV(e.description), 
        escapeCSV(e.payee), 
        e.income, 
        e.expense, 
        escapeCSV(e.receiptImageUrl || '')
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ledger_${report.month}_No${report.reportNumber}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [showModal]);

  return { exportCSV };
};