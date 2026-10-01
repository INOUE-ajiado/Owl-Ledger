import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../api/firebase';
import { nextDocNumber } from '../../api/numbering';
import { recordChange } from '../../api/changeHistory';
import { recordLog } from '../../api/logging';
import type { FixedInvoiceData, InvoiceRecord, Project } from '../../types';
import { endOfNextMonth, formatYmdSlash, splitTax } from '../../utils/money';

/** 請求内容を確定 (FIX) する。請求書番号を採番し、金額・日付を固定する */
export const fixInvoice = async (project: Project, issueDate: Date, taxRate: number): Promise<FixedInvoiceData> => {
  const { subtotal, tax, total } = splitTax(project.gloss, project.taxType, taxRate);
  const invoiceNumber = await nextDocNumber('I', issueDate);
  const fixedData: FixedInvoiceData = {
    issueDate: formatYmdSlash(issueDate),
    dueDate: formatYmdSlash(endOfNextMonth(issueDate)),
    subtotal,
    tax,
    total,
    unitPrice: project.characterCount > 0 ? subtotal / project.characterCount : 0,
    invoiceNumber,
    taxRate,
    fixedAt: new Date().toISOString(),
    fixedBy: auth.currentUser?.email ?? '',
  };
  await updateDoc(doc(db, 'projects', project.id), { isFixed: true, status: '請求済', fixedInvoiceData: fixedData });
  await recordChange({
    targetType: 'invoice', targetId: project.id, targetLabel: `${project.title} (${project.projectId})`,
    action: 'create', before: null, after: { status: '請求済', ...fixedData }, ignoreKeys: ['fixedAt', 'fixedBy'],
  });
  await recordLog({ action: 'FIX_INVOICE', targetType: 'project', targetId: project.id, summary: `請求書を確定: ${invoiceNumber} ${project.title}`, status: 'success' });
  return fixedData;
};

/**
 * 確定済みの請求書を取り消す。取消した請求書は履歴に残し、プロジェクトは再編集・再発行できる状態に戻す。
 * withCreditNote なら赤伝 (マイナスの請求書) の番号を採番する。
 */
export const cancelInvoice = async (project: Project, reason: string, withCreditNote: boolean): Promise<InvoiceRecord> => {
  if (!project.fixedInvoiceData) throw new Error('確定済みの請求書がありません。');
  const now = new Date();
  const record: InvoiceRecord = {
    ...project.fixedInvoiceData,
    invoiceNumber: project.fixedInvoiceData.invoiceNumber ?? project.projectId,
    taxRate: project.fixedInvoiceData.taxRate ?? 10,
    cancelledAt: now.toISOString(),
    cancelledBy: auth.currentUser?.email ?? '',
    cancelReason: reason,
  };
  if (withCreditNote) {
    record.creditNoteNumber = await nextDocNumber('C', now);
    record.creditNoteIssueDate = formatYmdSlash(now);
  }
  await updateDoc(doc(db, 'projects', project.id), {
    isFixed: false,
    status: '完了',
    fixedInvoiceData: deleteField(),
    invoiceHistory: [...(project.invoiceHistory ?? []), record],
  });
  await recordChange({
    targetType: 'invoice', targetId: project.id, targetLabel: `${project.title} (${project.projectId})`,
    action: 'update',
    changes: [
      { field: 'status', before: '請求済', after: '完了 (請求取消)' },
      { field: 'invoiceNumber', before: record.invoiceNumber ?? '', after: '' },
      { field: 'cancelReason', before: '', after: reason },
      ...(record.creditNoteNumber ? [{ field: 'creditNoteNumber', before: '', after: record.creditNoteNumber }] : []),
    ],
  });
  await recordLog({
    action: 'CANCEL_INVOICE', targetType: 'project', targetId: project.id,
    summary: `請求書を取消: ${record.invoiceNumber} ${project.title}${record.creditNoteNumber ? ` (赤伝 ${record.creditNoteNumber})` : ''}`,
    details: reason, status: 'info',
  });
  return record;
};

/** 見積書番号がまだなければ採番し、初回発行日と合わせて保存する */
export const ensureQuotationNumber = async (project: Project) => {
  const updates: Partial<Project> = {};
  if (!project.quotationNumber) updates.quotationNumber = await nextDocNumber('Q');
  if (!project.firstQuotationDate) updates.firstQuotationDate = formatYmdSlash(new Date());
  if (Object.keys(updates).length === 0) return updates;
  await updateDoc(doc(db, 'projects', project.id), updates);
  return updates;
};
