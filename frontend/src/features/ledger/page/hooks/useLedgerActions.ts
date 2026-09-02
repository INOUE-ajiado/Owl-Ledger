import { collection, addDoc, getDocs, doc, updateDoc, Timestamp, deleteDoc, query, where } from 'firebase/firestore';
import { ref, deleteObject, getDownloadURL, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../../../api/firebase';
import type { LedgerReport, LedgerEntry } from '../../../../types';
import { useModal } from '../../../../contexts';

export const useLedgerActions = () => {
  const { showModal } = useModal();

  const createNewReport = async (targetUserId: string, currentMonth: string) => {
    if (!targetUserId) return;
    const reportsCollection = collection(db, 'ledgerReports');
    const q = query(reportsCollection, where('userId', '==', targetUserId), where('month', '==', currentMonth));
    const querySnapshot = await getDocs(q);
    const nextNumber = querySnapshot.size > 0 ? Math.max(...querySnapshot.docs.map(d => d.data().reportNumber)) + 1 : 1;
    
    await addDoc(reportsCollection, {
      reportNumber: nextNumber,
      month: currentMonth,
      userId: targetUserId,
      status: '作成中',
      entries: [],
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
    } catch (error) {
      console.error("Firestore update failed in saveEntry:", error);
      throw error;
    }
  };

  const deleteEntry = async (currentReport: LedgerReport, entryId: string) => {
    showModal({
      title: '明細の削除',
      message: 'この明細を本当に削除しますか？添付されたレシートファイルも削除される可能性があります。',
      onConfirm: async () => {
        try {
          const entryToDelete = currentReport.entries.find(e => e.id === entryId);
          const updatedEntries = currentReport.entries.filter(e => e.id !== entryId);
          const reportRef = doc(db, 'ledgerReports', currentReport.id);
          await updateDoc(reportRef, { entries: updatedEntries });

          if (entryToDelete?.receiptImageUrl) {
            try {
              const fileRef = ref(storage, entryToDelete.receiptImageUrl);
              await deleteObject(fileRef);
            } catch (err: unknown) {
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               if ((err as any).code !== 'storage/object-not-found') {
                 console.error("File delete error", err);
               }
            }
          }
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
      showModal({ title: "成功", message: 'ファイルが添付されました。' });
    } catch (error) {
      console.error("Attachment failed", error);
      showModal({ title: "エラー", message: 'ファイルの添付に失敗しました。' });
    }
  };

  const deleteReport = async (report: LedgerReport) => {
    showModal({
      title: "レポート削除の確認",
      message: `出納帳 (No.${report.reportNumber}) を完全に削除します。`,
      onConfirm: async () => {
        try {
          const deletionPromises = report.entries.filter(e => e.receiptImageUrl).map(e => {
             const fileRef = ref(storage, e.receiptImageUrl!);
             return deleteObject(fileRef).catch(() => {});
          });
          await Promise.all(deletionPromises);
          await deleteDoc(doc(db, 'ledgerReports', report.id));
          showModal({ title: "成功", message: "レポートを削除しました。" });
        } catch (error) {
          console.error("Report delete failed", error);
          showModal({ title: "エラー", message: "削除に失敗しました。" });
        }
      }
    });
  };

  const submitForApproval = async (report: LedgerReport, uid: string, email: string) => {
    try {
        const reportRef = doc(db, 'ledgerReports', report.id);
        await updateDoc(reportRef, { 
            status: '承認待ち', 
            submittedAt: Timestamp.now(), 
            submitterName: email.split('@')[0], 
            submitterUid: uid 
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