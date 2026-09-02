import { useCallback } from 'react';
import type { LedgerReport } from '../../../../types';
import { useModal } from '../../../../contexts';

export const useLedgerCSV = () => {
  const { showModal } = useModal();

  const exportCSV = useCallback((report: LedgerReport | null) => {
    if (!report) {
      showModal({ title: "エラー", message: "CSVを出力するレポートがありません。" });
      return;
    }
    const headers = ['日付', '科目', '内容', '支払い先', '入金(¥)', '出金(¥)', 'レシートURL'];
    const rows = report.entries.map(e => {
      // ★ 修正: any を具体的な型に変更
      const escapeCSV = (str: string | number | undefined | null | (string | number)[]) => {
        if (str === undefined || str === null) return '""';
        let stringValue = String(str);
        if (Array.isArray(str)) stringValue = str.join(', ');
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return [
        e.date, 
        escapeCSV(e.subject), 
        escapeCSV(e.description), 
        escapeCSV(e.payee), 
        e.income, 
        e.expense, 
        e.receiptImageUrl || ''
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