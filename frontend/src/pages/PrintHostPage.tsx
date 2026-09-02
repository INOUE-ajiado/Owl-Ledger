import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../api/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import type { Project, Client, FixedInvoiceData, PurchaseOrder } from '../types';
import InvoiceTemplate from '../features/printing/InvoiceTemplate';
import PurchaseOrderTemplate from '../features/printing/PurchaseOrderTemplate';
import QuotationTemplate from '../features/printing/QuotationTemplate';
import PersonalInvoiceTemplate from '../features/printing/PersonalInvoiceTemplate';
import ShippingSlipTemplate from '../features/printing/ShippingSlipTemplate';
import ProgressBar from '../components/ProgressBar';
import { useAuth, useModal } from '../contexts';
import { useReactToPrint } from 'react-to-print';

const PrintHostPage = () => {
  const { docType, projectId } = useParams<{ docType: string; projectId: string }>();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [issuedPOs, setIssuedPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const { permissions } = useAuth();
  const { showModal } = useModal();
  const canWrite = permissions?.permissions?.projects === 'write';

  const componentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPageTitle = () => {
    switch (docType) {
      case 'invoice': return '請求書';
      case 'purchase-order': return '発注書';
      case 'quotation': return '御見積書';
      case 'personal-invoice': return '個人請求書';
      case 'shipping-slip': return '発送伝票';
      default: return 'ドキュメント';
    }
  };

  // ★ 修正: content ではなく contentRef を使用するように変更 (v3対応)
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: project ? `${getPageTitle()}_${project.title}` : getPageTitle(),
    onPrintError: (errorLocation: string, error: unknown) => console.error("Print Error:", errorLocation, error),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  useLayoutEffect(() => {
    const applyScale = () => {
      const container = containerRef.current;
      const contentWrapper = componentRef.current;
      const content = contentWrapper?.firstElementChild as HTMLElement;

      if (container && contentWrapper && content) {
        const containerWidth = container.clientWidth;
        const contentWidth = content.offsetWidth;

        if (containerWidth < contentWidth) {
          const scale = containerWidth / contentWidth;
          const contentWrapperElement = contentWrapper as HTMLElement;
          contentWrapperElement.style.transformOrigin = 'top center';
          contentWrapperElement.style.transform = `scale(${scale})`;

          const contentHeight = content.offsetHeight;
          container.style.height = `${contentHeight * scale}px`;
        } else {
          const contentWrapperElement = contentWrapper as HTMLElement;
          contentWrapperElement.style.transform = 'none';
          container.style.height = 'auto';
        }
      }
    };

    if (!loading && isVerified) {
      const timer = setTimeout(applyScale, 50);
      window.addEventListener('resize', applyScale);

      const currentContainer = containerRef.current;

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', applyScale);

        if (currentContainer) {
          currentContainer.style.height = 'auto';
        }
      };
    }
  }, [loading, isVerified]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch {
          setError("認証に失敗しました。");
          setAuthLoading(false);
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (authLoading || !projectId) return;

    let unsubscribePOs: (() => void) | undefined;

    const fetchData = async () => {
      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists()) throw new Error('プロジェクトが見つかりません。');
        const projectData = { id: projectSnap.id, ...projectSnap.data() } as Project;
        setProject(projectData);

        if (projectData.clientId) {
          const clientRef = doc(db, 'clients', projectData.clientId);
          const clientSnap = await getDoc(clientRef);
          if (!clientSnap.exists()) throw new Error('クライアント情報が見つかりません。');
          setClient({ id: clientSnap.id, ...clientSnap.data() } as Client);
        }

        if (docType === 'purchase-order') {
          const poCollectionRef = collection(db, 'projects', projectId, 'purchaseOrders');
          unsubscribePOs = onSnapshot(poCollectionRef, (snapshot) => {
            setIssuedPOs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
          });
        }
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribePOs) {
        unsubscribePOs();
      }
    };
  }, [projectId, docType, authLoading]);

  // ★ 追加: 見積書発行日の自動スタンプ
  useEffect(() => {
    if (loading || !project || docType !== 'quotation' || project.firstQuotationDate || !canWrite) return;

    const stampQuotationDate = async () => {
      const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
      try {
        const projectRef = doc(db, 'projects', project.id);
        await updateDoc(projectRef, { firstQuotationDate: today });
        setProject(prev => prev ? { ...prev, firstQuotationDate: today } : null);
        console.log("見積書発行日をスタンプしました:", today);
      } catch (err) {
        console.error("見積書発行日の保存に失敗しました:", err);
      }
    };

    stampQuotationDate();
  }, [loading, project, docType, canWrite]);

  useEffect(() => {
    if (loading || !project) return;

    const verifyAccess = async () => {
      if (docType !== 'purchase-order' && docType !== 'personal-invoice') {
        if (project.previewPassword) {
          const enteredPassword = prompt("このコンテンツは保護されています。パスワードを入力してください：");
          if (enteredPassword === project.previewPassword) setIsVerified(true);
          else {
            alert("パスワードが違います。アクセスできません。");
            setError("パスワードが認証されませんでした。");
          }
        } else {
          setIsVerified(true);
        }
      } else if (docType === 'purchase-order') {
        const params = new URLSearchParams(location.search);
        const poId = params.get('poId');
        if (!poId) {
          setError("発注書IDが指定されていません。");
          return;
        }

        try {
          const poRef = doc(db, 'projects', project.id, 'purchaseOrders', poId);
          const poSnap = await getDoc(poRef);
          if (!poSnap.exists()) throw new Error("発注書が見つかりません。");

          const poData = poSnap.data() as PurchaseOrder;
          if (poData.password) {
            const enteredPassword = prompt("この発注書は保護されています。パスワードを入力してください：");
            if (enteredPassword === poData.password) setIsVerified(true);
            else {
              alert("パスワードが違います。アクセスできません。");
              setError("パスワードが認証されませんでした。");
            }
          } else {
            setIsVerified(true);
          }
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          setError(err.message);
        }
      } else if (docType === 'personal-invoice') {
        if (project.previewPassword) {
          const enteredPassword = prompt("このコンテンツは保護されています。パスワードを入力してください：");
          if (enteredPassword === project.previewPassword) setIsVerified(true);
          else {
            alert("パスワードが違います。アクセスできません。");
            setError("パスワードが認証されませんでした。");
          }
        } else {
          setIsVerified(true);
        }
      }
    };

    verifyAccess();
  }, [project, loading, docType, location.search]);

  useEffect(() => {
    if (project) {
      const subName = project.title.split(/[\s　]+/).pop() || project.title;
      let label = 'ドキュメント';
      switch (docType) {
        case 'invoice':
          label = '請求書';
          break;
        case 'purchase-order':
          label = '発注書';
          break;
        case 'quotation':
          label = '見積書';
          break;
        case 'personal-invoice':
          label = '個人請求書';
          break;
        case 'shipping-slip':
          label = '発送伝票';
          break;
      }
      document.title = `【${label}】${subName}`;
    }
  }, [project, docType]);

  const handleFixInvoice = () => {
    if (!project || !canWrite) return;

    showModal({
      title: '請求内容の確定',
      message: 'この内容で請求をFIX（確定）しますか？\nFIXすると、プロジェクトの金額や関連情報が編集できなくなり、ステータスが「請求済」に更新されます。',
      onConfirm: async () => {
        const issueDate = new Date();
        const twoMonthsAhead = new Date(issueDate.getFullYear(), issueDate.getMonth() + 2, 1);
        const lastDayOfNextMonth = new Date(twoMonthsAhead.getTime() - (24 * 60 * 60 * 1000));

        let subtotal: number, tax: number, total: number;

        if (project.taxType === 'inclusive') {
          total = project.gloss;
          subtotal = total / 1.1;
          tax = total - subtotal;
        } else {
          subtotal = project.gloss;
          tax = subtotal * 0.1;
          total = subtotal + tax;
        }
        const fixedData: FixedInvoiceData = {
          issueDate: issueDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          dueDate: lastDayOfNextMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          subtotal,
          tax,
          total,
          unitPrice: project.characterCount > 0 ? subtotal / project.characterCount : 0,
        };

        try {
          const projectRef = doc(db, 'projects', project.id);
          await updateDoc(projectRef, {
            isFixed: true,
            status: '請求済',
            fixedInvoiceData: fixedData
          });
          setProject((prev: Project | null) => prev ? { ...prev, isFixed: true, status: '請求済', fixedInvoiceData: fixedData } : null);
          showModal({ title: '成功', message: '請求内容をFIXしました。' });
        } catch (error) {
          console.error("FIXに失敗しました:", error);
          showModal({ title: 'エラー', message: 'FIX処理中にエラーが発生しました。' });
        }
      }
    });
  };

  const renderTemplate = () => {
    if (!project) return null;
    switch (docType) {
      case 'invoice':
        return client ? <InvoiceTemplate project={project} client={client} /> : null;
      case 'quotation':
        return client ? <QuotationTemplate project={project} client={client} /> : null;
      case 'purchase-order': {
        const params = new URLSearchParams(location.search);
        const poId = params.get('poId');
        if (!poId) return <div>発注書IDが指定されていません。</div>;

        const po = issuedPOs.find(p => p.id === poId);
        if (!po) return <div>発注書データを読み込んでいます...</div>;

        const items = po.includedIndices.map(i => project.breakdown[i]);
        return <PurchaseOrderTemplate project={project} items={items} />;
      }
      case 'personal-invoice': {
        const params = new URLSearchParams(location.search);
        const indexStr = params.get('index');
        if (!indexStr) return <div>対象が指定されていません。</div>;
        const index = parseInt(indexStr, 10);
        const item = project.breakdown[index];
        if (!item) return <div>対象データが見つかりません。</div>;
        return <PersonalInvoiceTemplate project={project} item={item} />;
      }
      case 'shipping-slip':
        return client ? <ShippingSlipTemplate project={project} client={client} /> : null;
      default:
        return <div>不明なドキュメントタイプ、またはこのページの機能は移動しました。</div>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-4">
          <p className="text-center text-gray-600">データを読み込んでいます...</p>
          <ProgressBar />
        </div>
        <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      </div>
    );
  }

  if (error) return <div className="p-10 text-center text-red-500">エラー: {error}</div>;
  if (!project) return <div className="p-10 text-center">プロジェクトデータが見つかりません。</div>;


  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <p className="text-center text-gray-600">アクセス確認中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body, #root, .printable-container {
            width: auto;
            height: auto;
            overflow: visible;
            background-color: #fff;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none;
          }
          .scaled-for-screen {
            transform: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <div className="p-4 text-center text-white bg-gray-800 no-print">
        <p>{getPageTitle()} プレビュー</p>
        <div className="mt-2 space-x-4">
          {docType === 'invoice' && canWrite && !project.isFixed && (
            <button onClick={handleFixInvoice} className="px-4 py-2 bg-yellow-500 rounded hover:bg-yellow-600">
              FIX
            </button>
          )}
          {project.isFixed && docType === 'invoice' && (
            <span className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded">FIX済み</span>
          )}
          <button
            onClick={() => handlePrint()}
            className="px-4 py-2 bg-green-500 rounded hover:bg-green-600"
          >
            この{getPageTitle()}を印刷
          </button>
        </div>
      </div>
      <div className="w-full max-w-[210mm] mx-auto p-4 md:p-8 no-print printable-container">
        <div ref={containerRef} className="w-full">
          <div ref={componentRef} className="shadow-lg scaled-for-screen">
            {renderTemplate()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintHostPage;