import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailLink, isSignInWithEmailLink, type User } from 'firebase/auth';
import { auth, db, rtDb, getUserStatusRef } from './api/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref as dbRef, onDisconnect, set, onValue, serverTimestamp } from "firebase/database";
import type { UserPermissions, ModalOptions } from './types';
import { AuthContext, ModalContext } from './contexts';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import Modal from './components/Modal';

// ページ単位で分割して読み込み、初回表示を軽くする
const ClientPage = lazy(() => import('./pages/ClientPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const VendorPage = lazy(() => import('./pages/VendorPage'));
const VendorDetailPage = lazy(() => import('./pages/VendorDetailPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const WorkPage = lazy(() => import('./pages/WorkPage'));
const WorkDetailPage = lazy(() => import('./pages/WorkDetailPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PermissionsPage = lazy(() => import('./pages/PermissionsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PrintHostPage = lazy(() => import('./pages/PrintHostPage'));
const LedgerPage = lazy(() => import('./features/ledger/page/LedgerPage'));
const LedgerSearchPage = lazy(() => import('./features/ledger/search/LedgerSearchPage'));
const OrderConfirmationApprovalPage = lazy(() => import('./features/projects/approval/OrderConfirmationApprovalPage'));
const PersonalInvoicePrintPage = lazy(() => import('./features/printing/PersonalInvoicePrintPage'));
const PersonalReceiptPrintPage = lazy(() => import('./features/printing/PersonalReceiptPrintPage'));
const LedgerApprovalPage = lazy(() => import('./features/ledger/approval/LedgerApprovalPage'));
const ActivityLogPage = lazy(() => import('./features/admin/ActivityLogPage'));

const PageLoading = () => (
  <div className="flex items-center justify-center w-full h-full min-h-[50vh] text-sm text-earth-500">読み込み中...</div>
);

const describeEmailLinkError = (error: unknown): string => {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'メールアドレスが認証リンクの送信先と一致しません。';
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return '認証リンクの有効期限が切れているか、既に使用されています。もう一度認証リンクを送信してください。';
    default:
      return 'ログインに失敗しました。もう一度認証リンクを送信してください。';
  }
};

// メールリンクによるサインインを完了させる。失敗時はユーザー向けのエラーメッセージを返す。
const completeEmailLinkSignIn = async (): Promise<string | null> => {
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return null;

  // ワンタイムコードをURLから消し、リロード時に使用済みリンクで再サインインしないようにする
  window.history.replaceState(null, '', window.location.pathname);

  let email = window.localStorage.getItem('emailForSignIn');
  if (!email) {
    email = window.prompt('確認のためメールアドレスを再入力してください:');
  }
  if (!email) {
    return 'メールアドレスが入力されなかったため、ログインを完了できませんでした。';
  }

  try {
    await signInWithEmailLink(auth, email.trim(), href);
    return null;
  } catch (error) {
    console.error("Sign in with email link failed:", error);
    return describeEmailLinkError(error);
  } finally {
    window.localStorage.removeItem('emailForSignIn');
  }
};

// StrictMode でエフェクトが2回実行されても、ワンタイムリンクの消費は1回だけにする
let emailLinkSignIn: Promise<string | null> | null = null;
const getEmailLinkSignIn = () => (emailLinkSignIn ??= completeEmailLinkSignIn());

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);
  const [authError, setAuthError] = useState('');

  const showModal = (options: ModalOptions) => {
    setModalOptions(options);
  };

  const closeModal = () => {
    setModalOptions(null);
  };

  useEffect(() => {
    let unsubscribe = () => {};
    let stopPresence = () => {};
    let cancelled = false;

    // メールリンクでのサインインが終わってから認証状態の監視を始める
    // (先に監視すると未ログイン扱いで /login へ飛ばされ、失敗時の理由も表示できないため)
    getEmailLinkSignIn().then((linkError) => {
      if (cancelled) return;
      if (linkError) setAuthError(linkError);

      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        // 認証状態が変わるたびに前回の接続監視を解除し、リスナーが重複しないようにする
        stopPresence();
        stopPresence = () => {};

        try {
          if (currentUser && currentUser.email) {
            const permDoc = await getDoc(doc(db, 'permissions', currentUser.email));
            if (permDoc.exists()) {
              const permData = permDoc.data();
              setUser(currentUser);
              setPermissions({
                email: currentUser.email,
                uid: currentUser.uid,
                permissions: permData.permissions,
                isAdmin: permData.isAdmin === true,
              });

              if (!permData.uid) {
                await updateDoc(doc(db, 'permissions', currentUser.email), { uid: currentUser.uid });
              }

              const userStatusRef = getUserStatusRef(currentUser.email);
              const isOfflineForDatabase = { isOnline: false, last_changed: serverTimestamp() };
              const isOnlineForDatabase = { isOnline: true, last_changed: serverTimestamp() };

              stopPresence = onValue(dbRef(rtDb, '.info/connected'), (snapshot) => {
                if (snapshot.val() === false) return;
                onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
                  set(userStatusRef, isOnlineForDatabase);
                });
              });
            } else {
              // 権限未登録のユーザーはログインさせない (ログイン画面に理由を表示)
              setUser(null);
              setPermissions(null);
              setAuthError('このメールアドレスにはアクセス権限がありません。管理者に連絡してください。');
              await auth.signOut();
            }
          } else {
            setUser(null);
            setPermissions(null);
          }
        } catch (error) {
          console.error("Failed to load user permissions:", error);
          setUser(null);
          setPermissions(null);
          setAuthError('ログイン処理中にエラーが発生しました。時間をおいて再度お試しください。');
          await auth.signOut().catch(() => {});
        } finally {
          setLoading(false);
        }
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
      stopPresence();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-earth-50 space-y-4">
        <img src="/favicon.png" alt="Logo" className="w-16 h-16 animate-pulse" />
        <p className="text-earth-600 font-medium animate-pulse">Loading Owl Ledger...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, permissions }}>
      <ModalContext.Provider value={{ showModal }}>
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
          <Routes>
            {/* --- 通常ルート (要ログイン/権限) --- */}
            <Route path="/" element={user ? <AppLayout permissions={permissions} /> : <Navigate to="/login" />}>
              <Route index element={<DashboardPage />} />
              {permissions?.permissions?.dashboard !== 'disabled' && <Route path="dashboard" element={<DashboardPage />} />}
              {/* 同じページのままドロワーを開閉できるよう、プロジェクトIDは省略可能なパラメータにする */}
              {permissions?.permissions?.projects !== 'disabled' && <Route path="projects/:projectId?" element={<ProjectPage />} />}
              {/* 作品別収支 (アニメ作品ごとのプロデュース管理)。プロジェクトの画面権限に従う */}
              {permissions?.permissions?.projects !== 'disabled' && <Route path="works" element={<WorkPage />} />}
              {permissions?.permissions?.projects !== 'disabled' && <Route path="works/:workId" element={<WorkDetailPage />} />}
              {permissions?.permissions?.clients !== 'disabled' && <Route path="clients" element={<ClientPage />} />}
              {permissions?.permissions?.clients !== 'disabled' && <Route path="clients/:clientId" element={<ClientDetailPage />} />}
              {permissions?.permissions?.clients !== 'disabled' && <Route path="vendors" element={<VendorPage />} />}
              {permissions?.permissions?.clients !== 'disabled' && <Route path="vendors/:vendorId" element={<VendorDetailPage />} />}
              {permissions?.permissions?.ledger !== 'disabled' && <Route path="ledger" element={<LedgerPage />} />}
              {permissions?.permissions?.ledger !== 'disabled' && <Route path="ledger-search" element={<LedgerSearchPage />} />}
              {/* 管理者だけが使うページ (権限・ログ・会社設定) */}
              {permissions?.isAdmin && <Route path="permissions" element={<PermissionsPage />} />}
              {permissions?.isAdmin && <Route path="logs" element={<ActivityLogPage />} />}
              {permissions?.isAdmin && <Route path="settings" element={<SettingsPage />} />}
            </Route>

            {/* --- パブリック/特殊なルート --- */}
            <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage key={authError} initialError={authError} />} />

            {/* Ledger Approval Page (承認用URL、匿名可) */}
            <Route path="/approval/:reportId" element={<LedgerApprovalPage />} />

            {/* Project Order Confirmation Approval Page (承認用URL) */}
            <Route path="/order-confirmation-approval/:projectId" element={<OrderConfirmationApprovalPage />} />

            {/* カスタム印刷ルート (個人請求書/領収書) - 汎用パスより先に定義 */}
            <Route path="/print/personal-invoice/:projectId" element={<PersonalInvoicePrintPage />} />
            <Route path="/print/personal-receipt/:projectId" element={<PersonalReceiptPrintPage />} />

            {/* 汎用印刷ルート (見積書、請求書、赤伝、発注書など) - カスタムパスの後に定義 */}
            <Route path="/print/:docType/:projectId" element={<PrintHostPage />} />

          </Routes>
          </Suspense>
        </BrowserRouter>
        <Modal isOpen={!!modalOptions} options={modalOptions} onClose={closeModal} />
      </ModalContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;