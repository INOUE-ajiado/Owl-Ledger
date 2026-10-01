import { collection, addDoc, getDocs, doc, updateDoc, Timestamp, deleteDoc, query, where } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../../../api/firebase';
import type { LedgerReport, LedgerEntry } from '../../../../types';
import { useModal } from '../../../../contexts';
import { recordChange } from '../../../../api/changeHistory';
import { resolveStampName } from '../../../../api/stampName';

const reportLabel = (report: LedgerReport) => `出納帳 ${report.month} No.${report.reportNumber}`;

// 明細1件の変更を「entries.<明細ID>.<項目>」の形で履歴に残す (訂正・削除の履歴)
const recordEntryChange = (report: LedgerReport, action: 'create' | 'update' | 'delete', before: LedgerEntry | null, after: LedgerEntry | null) => {
  const entryId = (after ?? before)?.id ?? '';
  return recordChange({
    targetType: 'ledger',
    targetId: report.id,
    targetLabel: `${reportLabel(report)} / ${(after ?? before)?.date ?? ''} ${(after ?? before)?.payee ?? ''}`,
    action,
    before: before ? { entries: { [entryId]: before } } : null,
    after: after ? { entries: { [entryId]: after } } : null,
  });
};

export const useLedgerActions = () => {
  const { showModal } = useModal();

  const createNewReport = async (targetUserId: string, currentMonth: string) => {
    if (!targetUserId) return;
    const reportsCollection = collection(db, 'ledgerReports');
    const q = query(reportsCollection, where('userId', '==', targetUserId), where('month', '==', currentMonth));
    const querySnapshot = await getDocs(q);
    const nextNumber = querySnapshot.size > 0 ? Math.max(...querySnapshot.docs.map(d => d.data().reportNumber)) + 1 : 1;
    
    const newReport = await addDoc(reportsCollection, {
      reportNumber: nextNumber,
      month: currentMonth,
      userId: targetUserId,
      status: '作成中',
      entries: [],
    });
    await recordChange({
      targetType: 'ledger', targetId: newReport.id, targetLabel: `出納帳 ${currentMonth} No.${nextNumber}`,
      action: 'create', before: null, after: { month: currentMonth, reportNumber: nextNumber, status: '作成中' },
    });
  };

  /**
   * 明細を保存する関数
   * undefined を含むオブジェクトを Firestore に渡さないようクレンジング処理を実装。
   */
  const saveEntry = async (currentReport: LedgerReport, entry: LedgerEntry, editingEntryId?: string) => {
    try {
      let updatedEntries: LedgerEntry[];
      if (editingEntryId) {
        updatedEntries = currentReport.entries.map(e => e.id === editingEntryId ? entry : e);
      } else {
        updatedEntries = [...currentReport.entries, entry];
      }

      // Firestoreは undefined を許容しないため、JSON化の過程で undefined を削除する
      const cleanEntries = JSON.parse(JSON.stringify(updatedEntries));

      const reportRef = doc(db, 'ledgerReports', currentReport.id);
      await updateDoc(reportRef, { entries: cleanEntries });
      const before = editingEntryId ? currentReport.entries.find(e => e.id === editingEntryId) ?? null : null;
      await recordEntryChange(currentReport, editingEntryId ? 'update' : 'create', before, JSON.parse(JSON.stringify(entry)));
    } catch (error) {
      console.error("Firestore update failed in saveEntry:", error);
      throw error;
    }
  };

  // 添付ファイルは電子帳簿保存法の保存義務があるため、明細を削除してもストレージからは消さない
  const deleteEntry = async (currentReport: LedgerReport, entryId: string) => {
    showModal({
      title: '明細の削除',
      message: 'この明細を本当に削除しますか？削除した内容は変更履歴に残ります。',
      onConfirm: async () => {
        try {
          const entryToDelete = currentReport.entries.find(e => e.id === entryId);
          const updatedEntries = currentReport.entries.filter(e => e.id !== entryId);
          const reportRef = doc(db, 'ledgerReports', currentReport.id);
          await updateDoc(reportRef, { entries: updatedEntries });
          if (entryToDelete) await recordEntryChange(currentReport, 'delete', entryToDelete, null);
          showModal({ title: '成功', message: '明細を削除しました。' });
        } catch (error) {
          console.error("Delete failed", error);
          showModal({ title: 'エラー', message: '削除に失敗しました。' });
        }
      }
    });
  };

  const attachFile = async (currentReport: LedgerReport, entryId: string, file: File, uid: string) => {
    showModal({ title: "アップロード中", message: 'ファイルをサーバーに送信しています...', isLoading: true });
    try {
      const storageRef = ref(storage, `receipt-images/${uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      const updatedEntries = currentReport.entries.map(e => e.id === entryId ? { ...e, receiptImageUrl: downloadURL } : e);
      const reportRef = doc(db, 'ledgerReports', currentReport.id);
      await updateDoc(reportRef, { entries: updatedEntries });
      const before = currentReport.entries.find(e => e.id === entryId) ?? null;
      const after = updatedEntries.find(e => e.id === entryId) ?? null;
      await recordEntryChange(currentReport, 'update', before, after);
      showModal({ title: "成功", message: 'ファイルが添付されました。' });
    } catch (error) {
      console.error("Attachment failed", error);
      showModal({ title: "エラー", message: 'ファイルの添付に失敗しました。' });
    }
  };

  // 承認済み・経理提出済みの出納帳は保存義務があるため削除できない (セキュリティルールでも禁止)
  const deleteReport = async (report: LedgerReport) => {
    if (report.status !== '作成中' && report.status !== '承認待ち') {
      showModal({ title: "削除できません", message: "承認済みの出納帳は電子帳簿保存法に基づき保存が必要なため、削除できません。" });
      return;
    }
    showModal({
      title: "レポート削除の確認",
      message: `出納帳 (No.${report.reportNumber}) を削除します。明細の内容は変更履歴に残り、添付ファイルは保存されたままになります。`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'ledgerReports', report.id));
          await recordChange({
            targetType: 'ledger', targetId: report.id, targetLabel: reportLabel(report),
            action: 'delete', before: { status: report.status, entries: Object.fromEntries(report.entries.map(e => [e.id, e])) }, after: null,
          });
          showModal({ title: "成功", message: "レポートを削除しました。" });
        } catch (error) {
          console.error("Report delete failed", error);
          showModal({ title: "エラー", message: "削除に失敗しました。" });
        }
      }
    });
  };

  const submitForApproval = async (report: LedgerReport, uid: string) => {
    try {
        const reportRef = doc(db, 'ledgerReports', report.id);
        const submitterName = await resolveStampName('');
        await updateDoc(reportRef, {
            status: '承認待ち',
            submittedAt: Timestamp.now(),
            submitterName,
            submitterUid: uid
        });
        await recordChange({
          targetType: 'ledger', targetId: report.id, targetLabel: reportLabel(report),
          action: 'update', changes: [{ field: 'status', before: report.status, after: '承認待ち' }],
        });
        return true;
    } catch (error) {
        console.error(error);
        showModal({ title: "エラー", message: "提出に失敗しました。" });
        return false;
    }
  };

  const submitToAccounting = async (reportId: string) => {
    showModal({
        title: "経理へ提出",
        message: "この承認済み出納帳を経理へ提出しますか？",
        onConfirm: async () => {
            try {
                const reportRef = doc(db, 'ledgerReports', reportId);
                await updateDoc(reportRef, { status: '経理提出済み', accountingSubmittedAt: Timestamp.now() });
                await recordChange({
                  targetType: 'ledger', targetId: reportId, targetLabel: `出納帳 (${reportId})`,
                  action: 'update', changes: [{ field: 'status', before: '承認済み', after: '経理提出済み' }],
                });
                showModal({ title: "成功", message: "経理に提出しました。" });
            } catch (error) {
                console.error(error);
                showModal({ title: "エラー", message: "提出に失敗しました。" });
            }
        },
        onCancel: () => {}
    });
  };


  return { createNewReport, saveEntry, deleteEntry, attachFile, deleteReport, submitForApproval, submitToAccounting };
};