import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailLink, isSignInWithEmailLink, type User } from 'firebase/auth';
import { auth, db, rtDb } from './api/firebase';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref as dbRef, onDisconnect, set, onValue } from "firebase/database";
import type { UserPermissions, ModalOptions } from './types';
import { AuthContext, ModalContext } from './contexts';
import AppLayout from './components/AppLayout';
import ClientPage from './pages/ClientPage';
import ProjectPage from './pages/ProjectPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PermissionsPage from './pages/PermissionsPage';
import PrintHostPage from './pages/PrintHostPage';
import Modal from './components/Modal';
import LedgerPage from './features/ledger/page/LedgerPage';
import OrderConfirmationApprovalPage from './features/projects/approval/OrderConfirmationApprovalPage';
import PersonalInvoicePrintPage from './features/printing/PersonalInvoicePrintPage';
import PersonalReceiptPrintPage from './features/printing/PersonalReceiptPrintPage';
import LedgerApprovalPage from './features/ledger/approval/LedgerApprovalPage';
import ActivityLogPage from './features/admin/ActivityLogPage'; // ★ ログページを追加

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);

  const showModal = (options: ModalOptions) => {
    setModalOptions(options);
  };

  const closeModal = () => {
    setModalOptions(null);
  };

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('確認のためメールアドレスを再入力してください:');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .catch((error) => console.error("Sign in with email link failed:", error))
          .finally(() => window.localStorage.removeItem('emailForSignIn'));
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        setUser(currentUser);
        const permDoc = await getDoc(doc(db, 'permissions', currentUser.email));
        if (permDoc.exists()) {
          const permData = permDoc.data();
          setPermissions({
            email: currentUser.email,
            uid: currentUser.uid,
            permissions: permData.permissions
          });

          if (!permData.uid) {
            await updateDoc(doc(db, 'permissions', currentUser.email), { uid: currentUser.uid });
          }

          const userStatusRef = dbRef(rtDb, '/status/' + currentUser.email.replace(/\./g, ','));
          const isOfflineForDatabase = { isOnline: false, last_changed: serverTimestamp() };
          const isOnlineForDatabase = { isOnline: true, last_changed: serverTimestamp() };

          onValue(dbRef(rtDb, '.info/connected'), (snapshot) => {
            if (snapshot.val() === false) return;
            onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
              set(userStatusRef, isOnlineForDatabase);
            });
          });
        } else {
          setPermissions(null);
          auth.signOut();
        }
      } else {
        setUser(null);
        setPermissions(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
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
          <Routes>
            {/* --- 通常ルート (要ログイン/権限) --- */}
            <Route path="/" element={user ? <AppLayout permissions={permissions} /> : <Navigate to="/login" />}>
              <Route index element={<DashboardPage />} />
              {permissions?.permissions?.dashboard !== 'disabled' && <Route path="dashboard" element={<DashboardPage />} />}
              {permissions?.permissions?.projects !== 'disabled' && <Route path="projects" element={<ProjectPage />} />}
              {permissions?.permissions?.clients !== 'disabled' && <Route path="clients" element={<ClientPage />} />}
              {permissions?.permissions?.ledger !== 'disabled' && <Route path="ledger" element={<LedgerPage />} />}
              {permissions?.permissions?.permissions === 'write' && (
                <Route path="permissions" element={<PermissionsPage />} />
              )}
              {permissions?.permissions?.permissions === 'write' && ( // ★ ログルートを追加
                <Route path="logs" element={<ActivityLogPage />} />
              )}
            </Route>

            {/* --- パブリック/特殊なルート --- */}
            <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />

            {/* Ledger Approval Page (承認用URL、匿名可) */}
            <Route path="/approval/:reportId" element={<LedgerApprovalPage />} />

            {/* Project Order Confirmation Approval Page (承認用URL) */}
            <Route path="/order-confirmation-approval/:projectId" element={<OrderConfirmationApprovalPage />} />

            {/* ★ 1. カスタム印刷ルート (個人請求書/領収書) - 汎用パスより先に定義 */}
            <Route path="/print/personal-invoice/:projectId" element={<PersonalInvoicePrintPage />} />
            <Route path="/print/personal-receipt/:projectId" element={<PersonalReceiptPrintPage />} />

            {/* ★ 2. 汎用印刷ルート (見積書、請求書、発注書など) - カスタムパスの後に定義 */}
            <Route path="/print/:docType/:projectId" element={<PrintHostPage />} />

          </Routes>
        </BrowserRouter>
        <Modal isOpen={!!modalOptions} options={modalOptions} onClose={closeModal} />
      </ModalContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;