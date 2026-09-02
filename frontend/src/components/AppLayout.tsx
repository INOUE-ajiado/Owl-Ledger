import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { auth } from '../api/firebase';
import type { PageHeaderProps, UserPermissions, ViewType } from '../types'; // ★ 修正: ViewType を types.ts からインポート
import NotificationBell from './NotificationBell';

// type ViewType = 'dashboard' | 'projects' | 'clients' | 'ledger' | 'permissions'; // ★ 削除: ローカル定義は不要

interface AppLayoutProps {
  permissions: UserPermissions | null;
}

const AppLayout = ({ permissions }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');

  const [headerProps, setHeaderProps] = useState<PageHeaderProps>({ title: '' });

  useEffect(() => {
    const path = location.pathname.split('/')[1];
    setActiveView((path || 'dashboard') as ViewType);
  }, [location]);

  const setView = (view: ViewType) => navigate(`/${view}`);

  return (
    <div className="flex h-screen font-sans">
      <Sidebar activeView={activeView} setView={setView} permissions={permissions} />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="z-10 flex items-center justify-between px-4 py-2 bg-white/30 backdrop-blur-md border-b border-white/20 shadow-sm no-print">
          <h1 className="flex-shrink-0 mr-4 text-xl font-bold text-earth-800">{headerProps.title}</h1>
          <div className="flex flex-wrap items-center justify-end gap-4 min-w-0">
            <span className="hidden text-sm text-earth-600 xl:inline">{auth?.currentUser?.email}</span>
            <div className="min-w-0">{headerProps.actions}</div>
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto w-full h-full p-0">
          <Outlet context={{ setHeaderProps, permissions }} />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;