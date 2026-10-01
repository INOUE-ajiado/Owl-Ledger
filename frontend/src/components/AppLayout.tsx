import { useState, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { auth } from '../api/firebase';
import type { PageHeaderProps, UserPermissions, ViewType } from '../types';
import NotificationBell from './NotificationBell';
import ErrorBoundary from './ErrorBoundary';

interface AppLayoutProps {
  permissions: UserPermissions | null;
}

const AppLayout = ({ permissions }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeView = (location.pathname.split('/')[1] || 'dashboard') as ViewType;
  // スマホではサイドバーを隠し、メニューボタンで開く
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [headerProps, setHeaderProps] = useState<PageHeaderProps>({ title: '' });

  const setView = (view: ViewType) => {
    setIsMenuOpen(false);
    navigate(`/${view}`);
  };

  return (
    <div className="flex h-screen font-sans">
      <div className="hidden md:flex">
        <Sidebar activeView={activeView} setView={setView} permissions={permissions} />
      </div>
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden no-print" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMenuOpen(false)} />
          <div className="relative flex bg-earth-50 shadow-xl">
            <Sidebar activeView={activeView} setView={setView} permissions={permissions} />
          </div>
        </div>
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 md:px-4 bg-white/30 backdrop-blur-md border-b border-white/20 shadow-sm no-print">
          <div className="flex items-center order-1 min-w-0 gap-2">
            <button type="button" onClick={() => setIsMenuOpen(true)} className="p-1.5 -ml-1 rounded-md text-earth-700 hover:bg-white/40 md:hidden" aria-label="メニューを開く">
              <Menu size={22} />
            </button>
            <h1 className="flex-shrink-0 mr-2 text-lg font-bold md:text-xl text-earth-800">{headerProps.title}</h1>
          </div>
          {/* スマホではタイトルの右に通知、操作ボタン類は下の段に回す */}
          <div className="flex flex-wrap items-center justify-end order-3 w-full min-w-0 gap-2 md:order-2 md:w-auto md:flex-1 md:gap-4">
            <span className="hidden text-sm text-earth-600 xl:inline">{auth?.currentUser?.email}</span>
            <div className="min-w-0">{headerProps.actions}</div>
          </div>
          <div className="order-2 ml-auto md:order-3 md:ml-0">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto w-full h-full p-0">
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<div className="p-10 text-sm text-center text-earth-500">読み込み中...</div>}>
              <Outlet context={{ setHeaderProps, permissions }} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
