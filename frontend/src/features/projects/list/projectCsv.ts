import type { Project } from '../../../types';
import { projectFinancials, splitTax } from '../../../utils/money';
import { toCsvCell } from '../../../utils/security';

/** プロジェクト一覧を CSV (Excel で開ける UTF-8 BOM 付き) でダウンロードする */
export const exportProjectsCsv = (projects: Project[], taxRate: number) => {
  const headers = ['管理ID', '登録日', '納期', '作品名', 'クライアント名', 'カテゴリ', '主担当作業者', '版権担当者', 'ステータス', 'GLOSS', '税の扱い', '税抜合計', '消費税', 'NET', 'MARGIN', '見積書番号', '請求書番号'];
  const rows = projects.map(p => {
    const taxType = p.taxType || 'exclusive';
    const { subtotal, tax } = splitTax(p.gloss, taxType, taxRate);
    const { margin, net } = projectFinancials({ ...p, projectType: 'standard' }, taxRate);
    return [
      p.projectId, p.registrationDate, p.dueDate, p.title, p.clientName, p.category, p.workerName, p.copyrightManager, p.status,
      p.gloss, taxType === 'inclusive' ? '税込' : '税抜', Math.round(subtotal), Math.round(tax), Math.round(net), Math.round(margin),
      p.quotationNumber ?? '', p.isFixed ? (p.fixedInvoiceData?.invoiceNumber ?? p.projectId) : '',
    ].map(v => toCsvCell(v ?? '')).join(',');
  });

  const blob = new Blob(['﻿' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `projects_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
