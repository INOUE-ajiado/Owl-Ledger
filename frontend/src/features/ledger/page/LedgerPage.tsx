import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppOutletContext, useModal, useAuth } from '../../../contexts';
import type { LedgerEntry } from '../../../types';

// Components
import LedgerList from '../LedgerList';
import SubjectManager from '../SubjectManager';
import { LedgerEntryForm } from './components/LedgerEntryForm';
import { LedgerMonthNavigator } from './components/LedgerMonthNavigator';
import { LedgerSummaryBar } from './components/LedgerSummaryBar';
import { ProcessedReportsList } from './components/ProcessedReportsList';
import { ApprovalLinkModal } from './components/ApprovalLinkModal';
import { Info, Plus } from 'lucide-react';

// Hooks
import { useLedgerData } from './hooks/useLedgerData';
import { useLedgerActions } from './hooks/useLedgerActions';
import { useLedgerCSV } from './hooks/useLedgerCSV';
import { useLedgerOverview } from './hooks/useLedgerOverview';
import { formatMonthLabel, shiftMonth, toMonthKey } from './ledgerUtils';

const LedgerPage = () => {
  const { setHeaderProps, permissions } = useAppOutletContext();
  const { showModal } = useModal();
  const { user } = useAuth();

  // State
  // 表示月は URL (?month=YYYY-MM) に保持し、再読み込みやブックマークでも同じ月を開けるようにする
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const currentMonth = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : toMonthKey(new Date());
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
  const overview = useLedgerOverview(targetUserId);
  const actions = useLedgerActions();
  const { exportCSV } = useLedgerCSV();

  // イベントハンドラ
  const selectMonth = (month: string) => {
    if (month === currentMonth) return;
    setEditingEntry(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('month', month);
      return next;
    }, { replace: true });
  };

  // 初回のみ全体をローディング表示し、月切り替え時は表示を残したまま薄く表示する
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!loading) setHasLoaded(true);
  }, [loading]);

  // ← / → キーで前月・翌月へ（入力中は無効）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') selectMonth(shiftMonth(currentMonth, -1));
      if (e.key === 'ArrowRight') selectMonth(shiftMonth(currentMonth, 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

  if (!hasLoaded) return <p className="p-10 text-center text-gray-500">読み込み中...</p>;

  const showForm = canWrite && currentReport;

  return (
    <div className="w-full min-h-full pb-8">
      <div className="lg:sticky lg:top-0 z-20 bg-white/70 backdrop-blur-md border-b border-white/30 shadow-sm">
        <LedgerMonthNavigator currentMonth={currentMonth} overview={overview} onSelectMonth={selectMonth} />
        <LedgerSummaryBar
          currentMonth={currentMonth}
          currentReport={currentReport}
          onDeleteReport={() => currentReport && actions.deleteReport(currentReport)}
          onSubmitForApproval={handleSubmitForApproval}
          canWrite={canWrite}
        />
      </div>

      <div className={`transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <ProcessedReportsList
          reports={processedReports}
          canWrite={canWrite}
          isMasterUser={isMasterUser}
          onShowApprovalLink={handleShowApprovalLink}
          onSubmitToAccounting={actions.submitToAccounting}
          onCopyUrl={(id) => copyUrlToClipboard(`${window.location.origin}/approval/${id}`)}
          onDeleteReport={actions.deleteReport}
        />

        {currentReport ? (
          <div className={`grid gap-4 px-0 sm:px-4 pt-3 ${showForm ? 'lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]' : ''}`}>
            {showForm && (
              <aside className="px-4 sm:px-0 lg:order-2 lg:sticky lg:top-40 lg:self-start">
                <LedgerEntryForm
                  currentReport={currentReport}
                  subjects={subjects}
                  editingEntry={editingEntry}
                  onSave={(entry) => actions.saveEntry(currentReport, entry, editingEntry?.id)}
                  onCancelEdit={() => setEditingEntry(null)}
                  isLocked={currentReport.status !== '作成中'}
                />
              </aside>
            )}
            <div className="lg:order-1 min-w-0 overflow-hidden sm:rounded-lg border-y sm:border border-white/40 shadow-sm">
              <LedgerList
                report={currentReport}
                onAttachFile={(entryId, file) => actions.attachFile(currentReport, entryId, file, user!.uid)}
                isLocked={currentReport.status !== '作成中' || !canWrite}
                onEdit={setEditingEntry}
                onDelete={(entryId) => actions.deleteEntry(currentReport, entryId)}
                editingEntryId={editingEntry?.id}
              />
            </div>
          </div>
        ) : (
          canWrite && (
            <div className="mx-4 mt-3 p-8 text-center bg-white/50 border border-dashed border-earth-300 rounded-lg">
              <p className="text-earth-700">{formatMonthLabel(currentMonth)}の出納帳はまだありません。</p>
              <button onClick={() => actions.createNewReport(targetUserId, currentMonth)} className="inline-flex items-center gap-1.5 px-6 py-2 mt-4 text-white bg-earth-600 rounded-md hover:bg-earth-700 shadow-lg transform hover:scale-[1.02] transition-all">
                <Plus size={16} />
                新規作成
              </button>
            </div>
          )
        )}

        {!canWrite && !currentReport && processedReports.length === 0 && (
          <p className="py-12 text-center text-sm text-earth-500">{formatMonthLabel(currentMonth)}の出納帳はありません。</p>
        )}
      </div>

      {!isMasterUser && (
        <p className="flex items-center justify-center gap-1.5 px-4 mt-6 text-xs text-earth-500">
          <Info size={14} className="flex-shrink-0" />
          登録した出納帳データは、ご本人と管理者のみが閲覧・管理できます。
        </p>
      )}

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
