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
import { FilePlus2, Info, Plus } from 'lucide-react';

// Hooks
import { useLedgerData } from './hooks/useLedgerData';
import { useLedgerActions } from './hooks/useLedgerActions';
import { useLedgerCSV } from './hooks/useLedgerCSV';
import { useLedgerOverview } from './hooks/useLedgerOverview';
import { formatMonthLabel, shiftMonth, toMonthKey } from './ledgerUtils';

const panelClass = "min-w-0 lg:self-start overflow-hidden bg-white/50 backdrop-blur-sm border-y sm:border border-white/40 sm:rounded-xl shadow-sm";
const panelHeaderClass = "px-4 py-2.5 text-sm font-semibold text-earth-800 bg-white/60 border-b border-white/40";

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

      <div className={`grid gap-4 px-0 sm:px-4 pt-3 transition-opacity lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* 左: 提出済みレポート */}
        <section className={panelClass}>
          <h3 className={panelHeaderClass}>
            提出済みレポート
            <span className="ml-1.5 font-normal text-earth-500">{processedReports.length}件</span>
          </h3>
          <div className="p-3">
            {processedReports.length > 0 ? (
              <ProcessedReportsList
                reports={processedReports}
                canWrite={canWrite}
                isMasterUser={isMasterUser}
                onShowApprovalLink={handleShowApprovalLink}
                onSubmitToAccounting={actions.submitToAccounting}
                onCopyUrl={(id) => copyUrlToClipboard(`${window.location.origin}/approval/${id}`)}
                onDeleteReport={actions.deleteReport}
              />
            ) : (
              <p className="py-6 text-center text-sm text-earth-500">この月の提出済みレポートはありません。</p>
            )}
          </div>
        </section>

        {/* 右: 明細（上に入力フォーム、下に明細一覧） */}
        <section className={panelClass}>
          <h3 className={panelHeaderClass}>
            明細
            {currentReport && (
              <span className="ml-1.5 font-normal text-earth-500">No.{currentReport.reportNumber} {currentReport.status}</span>
            )}
          </h3>

          {currentReport ? (
            <div className="p-0 sm:p-3 space-y-3">
              {canWrite && (
                <div className="px-3 pt-3 sm:p-0">
                  <LedgerEntryForm
                    currentReport={currentReport}
                    subjects={subjects}
                    editingEntry={editingEntry}
                    onSave={(entry) => actions.saveEntry(currentReport, entry, editingEntry?.id)}
                    onCancelEdit={() => setEditingEntry(null)}
                    isLocked={currentReport.status !== '作成中'}
                  />
                </div>
              )}
              <div className="overflow-hidden sm:rounded-lg border-y sm:border border-white/40 shadow-sm">
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
          ) : canWrite ? (
            <div className="px-6 py-10 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-earth-50 text-earth-600">
                <FilePlus2 size={24} />
              </div>
              <h4 className="font-semibold text-earth-900">出納帳を新規作成</h4>
              <p className="mt-2 text-sm text-earth-600">
                {processedReports.length > 0
                  ? `${formatMonthLabel(currentMonth)}の提出済みレポートとは別に、新しい出納帳を作成できます。`
                  : `${formatMonthLabel(currentMonth)}の出納帳はまだありません。`}
              </p>
              <p className="mt-1 text-xs text-earth-500">作成すると、ここで明細を入力できます。</p>
              <button onClick={() => actions.createNewReport(targetUserId, currentMonth)} className="inline-flex items-center justify-center gap-1.5 px-8 py-2.5 mt-5 text-white bg-earth-600 rounded-md hover:bg-earth-700 shadow-lg transition-all active:scale-[0.98]">
                <Plus size={16} />
                新規作成
              </button>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-earth-500">この月の作成中の明細はありません。</p>
          )}
        </section>
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
