import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { db, auth } from '../../../api/firebase';
import type { LedgerReport, UserPermissions } from '../../../types';
import ProgressBar from '../../../components/ProgressBar';
import { Menu, X, Printer, CheckCircle, Send } from 'lucide-react';
import { useModal } from '../../../contexts';
import { LedgerReportSheet } from './components/LedgerReportSheet';
import { ApprovalSidebar } from './components/ApprovalSidebar';

const LedgerApprovalPage = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<LedgerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);

  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const componentRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { showModal } = useModal();

  useLayoutEffect(() => {
    const applyScale = () => {
      const container = containerRef.current;
      const contentWrapper = componentRef.current;

      if (container && contentWrapper && window.innerWidth > 640) {
        const content = contentWrapper.firstElementChild as HTMLElement;
        if (!content) return;

        const containerWidth = container.clientWidth;
        const contentWidth = content.offsetWidth;

        if (containerWidth < contentWidth) {
          const newScale = containerWidth / contentWidth;
          contentWrapper.style.transformOrigin = 'top center';
          contentWrapper.style.transform = `scale(${newScale})`;
          container.style.height = `${content.offsetHeight * newScale}px`;
        } else {
          contentWrapper.style.transform = 'none';
          container.style.height = 'auto';
        }
      } else if (container) {
        if (componentRef.current) componentRef.current.style.transform = 'none';
        container.style.height = 'auto';
      }
    };

    if (!loading) {
      const timer = setTimeout(applyScale, 100);
      window.addEventListener('resize', applyScale);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', applyScale);
      };
    }
  }, [loading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.isAnonymous && user.email) {
          const permDoc = await getDoc(doc(db, 'permissions', user.email));
          if (permDoc.exists()) {
            setPermissions(permDoc.data() as UserPermissions);
          }
        }
        setAuthLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (authError) {
          console.error("Anonymous auth error:", authError);
          setError("認証に失敗しました。");
          setAuthLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let unsubscribeReport: (() => void) | undefined;

    const fetchReport = async () => {
      if (!reportId) return;
      const reportRef = doc(db, 'ledgerReports', reportId);

      unsubscribeReport = onSnapshot(reportRef, (docSnap) => {
        if (docSnap.exists()) {
          const reportData = { id: docSnap.id, ...docSnap.data() } as LedgerReport;
          setReport(reportData);
          if (reportData.entries.length > 0 && reportData.entries[0].receiptImageUrl && !selectedReceiptUrl) {
            setSelectedReceiptUrl(reportData.entries[0].receiptImageUrl);
          }
        } else {
          setError('レポートが見つかりません。');
        }
        setLoading(false);
      });
    };

    fetchReport();
    return () => { if (unsubscribeReport) unsubscribeReport(); };
  }, [reportId, authLoading, selectedReceiptUrl]);

  const canWrite = permissions?.permissions?.ledger === 'write';

  const handleApprove = async () => {
    if (!reportId) return;
    if (window.confirm("この出納帳を承認しますか？")) {
      try {
        const reportRef = doc(db, 'ledgerReports', reportId);
        const currentUser = auth.currentUser;
        const approverName = currentUser?.email ? currentUser.email.split('@')[0] : '小澤';
        await updateDoc(reportRef, {
          status: '承認済み',
          approvedAt: Timestamp.now(),
          approverName: approverName
        });
        showModal({ title: "成功", message: "承認しました。" });
      } catch (err) {
        console.error("Approval failed: ", err);
        showModal({ title: "承認エラー", message: "承認に失敗しました。" });
      }
    }
  };

  const handleSubmitToAccounting = async () => {
    if (!reportId || !canWrite) return;
    showModal({
      title: "経理へ提出",
      message: "このまま経理に提出しますか？",
      onConfirm: async () => {
        try {
          const reportRef = doc(db, 'ledgerReports', reportId);
          await updateDoc(reportRef, {
            status: '経理提出済み',
            accountingSubmittedAt: Timestamp.now()
          });
          showModal({ title: "成功", message: "経理に提出しました。" });
        } catch {
          showModal({ title: "エラー", message: "提出に失敗しました。" });
        }
      },
      onCancel: () => { }
    });
  };


  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-4 font-bold text-gray-600">
          <p className="text-center">レポートを読み込んでいます...</p>
          <ProgressBar />
        </div>
      </div>
    );
  }

  if (error) return <div className="p-10 font-bold text-center text-red-500">エラー: {error}</div>;
  if (!report) return <div className="p-10 font-bold text-center">レポートが見つかりません。</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @media print { 
            .no-print { display: none !important; } 
            body { background-color: #fff !important; } 
            .printable-area { box-shadow: none !important; margin: 0 !important; width: 100% !important; min-height: 0 !important; transform: none !important; }
        }
        .thin-border { border: 0.5px solid #e5e7eb; }
        @media (max-width: 640px) {
            .printable-area { width: 100% !important; padding: 1rem !important; min-height: auto !important; }
        }
      `}</style>

      {/* --- ヘッダー：紺色ベースのダークイメージを維持 --- */}
      <header className="sticky top-0 z-50 bg-[#1e293b] text-white shadow-md no-print border-b border-white/10">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center">
            <button
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="p-2 -ml-2 text-gray-300 rounded-md hover:bg-white/10 md:hidden"
            >
              {isStatusOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="ml-2 md:ml-4">
              <h1 className="text-sm font-bold text-white sm:text-base">
                出納帳プレビュー <span className="ml-1 font-normal text-gray-400">No.{report.reportNumber}</span>
              </h1>
              <p className="text-[10px] text-gray-400">{report.month} 分</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* 印刷ボタン：薄灰色/ゴーストデザイン */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-200 transition-all border rounded-lg bg-white/10 border-white/20 sm:px-4 hover:bg-white/20 active:scale-95"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">印刷 / PDF出力</span>
              <span className="sm:hidden">印刷</span>
            </button>

            {/* 承認ボタン：エメラルドグリーン + テキスト大きめ */}
            {report.status === '承認待ち' && (
              <button
                onClick={handleApprove}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-black text-white transition-all border rounded-lg shadow-lg bg-emerald-500 border-emerald-400 sm:px-6 hover:bg-emerald-400 hover:shadow-emerald-500/20 active:bg-emerald-600 active:scale-95 active:shadow-inner"
              >
                <CheckCircle size={18} />
                <span>承認する</span>
              </button>
            )}

            {/* 経理提出ボタン：インディゴ */}
            {canWrite && report.status === '承認済み' && (
              <button
                onClick={handleSubmitToAccounting}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-white transition-all bg-indigo-500 border border-indigo-400 rounded-lg shadow-md sm:px-4 hover:bg-indigo-400 active:bg-indigo-600 active:scale-95"
              >
                <Send size={16} />
                <span>経理へ提出</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="relative flex flex-col p-2 md:p-8 md:flex-row md:justify-center">
        <ApprovalSidebar
          report={report}
          selectedReceiptUrl={selectedReceiptUrl}
          isStatusOpen={isStatusOpen}
          onModalOpen={() => setIsModalOpen(true)}
        />
        <div ref={containerRef} className="flex justify-center flex-grow mt-4 overflow-hidden md:mt-0">
          <div ref={componentRef} className="mx-auto transition-transform duration-200">
            <LedgerReportSheet
              report={report}
              onSelectReceipt={(url) => setSelectedReceiptUrl(url)}
            />
          </div>
        </div>
      </div>

      {isModalOpen && selectedReceiptUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75 no-print p-4" onClick={() => setIsModalOpen(false)}>
          <div className="relative w-full max-w-4xl bg-white rounded-lg p-2 h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <iframe src={selectedReceiptUrl} className="w-full h-full border-none" title="receipt-modal-preview"></iframe>
            <button onClick={() => setIsModalOpen(false)} className="absolute p-2 text-gray-800 transition-transform bg-white rounded-full shadow-lg -top-4 -right-4 hover:bg-gray-200 active:scale-90">
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerApprovalPage;