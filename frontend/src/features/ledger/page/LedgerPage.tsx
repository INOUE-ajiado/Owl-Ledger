import { useState, useEffect } from 'react';
import { useAppOutletContext, useModal, useAuth } from '../../../contexts';
import type { LedgerEntry } from '../../../types';

// Components
import LedgerList from '../LedgerList';
import SubjectManager from '../SubjectManager';
import { LedgerEntryForm } from './components/LedgerEntryForm';
import { LedgerHeaderControls } from './components/LedgerHeaderControls';
import { ProcessedReportsList } from './components/ProcessedReportsList';
import { ApprovalLinkModal } from './components/ApprovalLinkModal';
import { Info } from 'lucide-react';

// Hooks
import { useLedgerData } from './hooks/useLedgerData';
import { useLedgerActions } from './hooks/useLedgerActions';
import { useLedgerCSV } from './hooks/useLedgerCSV';

const LedgerPage = () => {
  const { setHeaderProps, permissions } = useAppOutletContext();
  const { showModal } = useModal();
  const { user } = useAuth();

  // State
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [isSubjectManagerOpen, setIsSubjectManagerOpen] = useState(false);
  const [showApprovalLinkModal, setShowApprovalLinkModal] = useState(false);
  const [approvalLink, setApprovalLink] = useState('');

  // 権限・ユーザー判定
  const isMasterUser = user?.email === 'inoue@ajiado.co.jp';
  const canWrite = permissions?.permissions?.ledger === 'write';

  // 初期ターゲット設定
  useEffect(() => {
    if (user && targetUserId === '') setTargetUserId(user.uid);
  }, [user, targetUserId]);

  // カスタムフックの呼び出し
  const { currentReport, processedReports, subjects, usersList, loading } = useLedgerData(currentMonth, targetUserId, isMasterUser);
  const actions = useLedgerActions();
  const { exportCSV } = useLedgerCSV();

  // イベントハンドラ
  const changeMonth = (amount: number) => {
    const newDate = new Date(currentMonth + '-01');
    newDate.setMonth(newDate.getMonth() + amount);
    setCurrentMonth(newDate.toISOString().slice(0, 7));
  };

  const handleShowApprovalLink = (reportId: string) => {
    const url = `${window.location.origin}/approval/${reportId}`;
    setApprovalLink(url);
    setShowApprovalLinkModal(true);
  };

  const handleSubmitForApproval = () => {
    if (!currentReport || !user) return;
    showModal({
      title: "提出確認",
      message: "この内容で提出し、承認用リンクを生成しますか？",
      onConfirm: async () => {
        const success = await actions.submitForApproval(currentReport, user.uid, user.email || '');
        if (success) handleShowApprovalLink(currentReport.id);
      }
    });
  };

  const copyUrlToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => showModal({ title: "成功", message: "URLをコピーしました。" }))
      .catch(() => showModal({ title: "エラー", message: "コピーに失敗しました。" }));
  };

  // ヘッダー設定
  useEffect(() => {
    setHeaderProps({
      title: '出納帳',
      actions: (
        <div className="flex items-center space-x-4">
          {isMasterUser && (
            <div className="flex items-center px-2 bg-white border rounded-md">
              <span className="mr-2 text-xs text-gray-500">表示対象:</span>
              <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="py-1 text-sm border-none cursor-pointer focus:ring-0">
                {usersList.map(u => (<option key={u.uid} value={u.uid}>{u.email}</option>))}
                {!usersList.find(u => u.uid === user?.uid) && user && (<option value={user.uid}>{user.email}</option>)}
              </select>
            </div>
          )}
          {canWrite && (
            <>
              <button onClick={() => exportCSV(currentReport || processedReports[0])} disabled={!currentReport && processedReports.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-earth-500 rounded-md hover:bg-earth-600 disabled:bg-earth-200 shadow-md transition-all duration-200">CSV出力</button>
              <div className="relative">
                <button onClick={() => setIsSubjectManagerOpen(prev => !prev)} className="px-4 py-2 text-sm font-medium text-earth-800 bg-white/40 border border-white/30 rounded-md hover:bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm">科目登録</button>
                <SubjectManager isOpen={isSubjectManagerOpen} onClose={() => setIsSubjectManagerOpen(false)} />
              </div>
            </>
          )}
        </div>
      )
    });
  }, [setHeaderProps, isSubjectManagerOpen, currentReport, processedReports, canWrite, isMasterUser, targetUserId, usersList, user, exportCSV]);

  if (loading) return <p className="p-10 text-center text-gray-500">読み込み中...</p>;

  return (
    <div>
      {!isMasterUser && (
        <div className="flex items-center gap-2 p-3 mb-6 text-xs text-earth-600 border border-white/20 rounded-lg bg-white/20 backdrop-blur-sm">
          <Info size={16} className="flex-shrink-0 text-blue-500" />
          <p>登録した出納帳データは、ご本人と管理者のみが閲覧・管理できます。</p>
        </div>
      )}

      {canWrite && currentReport && (
        <LedgerEntryForm
          currentReport={currentReport}
          subjects={subjects}
          editingEntry={editingEntry}
          onSave={(entry) => actions.saveEntry(currentReport, entry, editingEntry?.id)}
          onCancelEdit={() => setEditingEntry(null)}
          isLocked={currentReport.status !== '作成中'}
        />
      )}

      <div className="glass-panel">
        <LedgerHeaderControls
          currentMonth={currentMonth}
          onChangeMonth={changeMonth}
          currentReport={currentReport}
          onDeleteReport={() => currentReport && actions.deleteReport(currentReport)}
          onSubmitForApproval={handleSubmitForApproval}
          canWrite={canWrite}
        />

        {currentReport ? (
          <LedgerList
            report={currentReport}
            onAttachFile={(entryId, file) => actions.attachFile(currentReport, entryId, file, user!.uid)}
            isLocked={currentReport.status !== '作成中' || !canWrite}
            onEdit={setEditingEntry}
            onDelete={(entryId) => actions.deleteEntry(currentReport, entryId)}
          />
        ) : (
          canWrite && (
            <div className="p-6 text-center">
              <p className="text-gray-600">この月の新しい出納帳を作成しますか？</p>
              <button onClick={() => actions.createNewReport(targetUserId, currentMonth)} className="px-6 py-2 mt-4 text-white bg-earth-600 rounded-md hover:bg-earth-700 shadow-lg transform hover:scale-[1.02] transition-all">新規作成</button>
            </div>
          )
        )}

        <ProcessedReportsList
          reports={processedReports}
          canWrite={canWrite}
          isMasterUser={isMasterUser}
          onShowApprovalLink={handleShowApprovalLink}
          onSubmitToAccounting={actions.submitToAccounting}
          onCopyUrl={(id) => copyUrlToClipboard(`${window.location.origin}/approval/${id}`)}
          onDeleteReport={actions.deleteReport}
        />
      </div>

      {showApprovalLinkModal && (
        <ApprovalLinkModal
          link={approvalLink}
          onClose={() => setShowApprovalLinkModal(false)}
          onCopy={copyUrlToClipboard}
        />
      )}
    </div>
  );
};

export default LedgerPage;