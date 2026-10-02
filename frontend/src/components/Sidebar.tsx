import { onDisconnect, set, serverTimestamp } from 'firebase/database';
import { auth, getUserStatusRef } from '../api/firebase';
import type { UserPermissions, PermissionSet, ViewType } from '../types';
import { APP_VERSION } from '../version';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BookText,
  KeyRound,
  LogOut,
  History,
  Truck,
  FileSearch,
  Settings,
  Clapperboard,
} from 'lucide-react';

interface SidebarProps {
  activeView: ViewType;
  setView: (view: ViewType) => void;
  permissions: UserPermissions | null;
}

// ログアウト前にオンライン状態をオフラインにする (サインアウト後は書き込めないため先に行う)
const handleLogout = async () => {
  const email = auth.currentUser?.email;
  if (email) {
    const statusRef = getUserStatusRef(email);
    try {
      await onDisconnect(statusRef).cancel();
      await set(statusRef, { isOnline: false, last_changed: serverTimestamp() });
    } catch (error) {
      console.error("Failed to update online status on logout:", error);
    }
  }
  await auth.signOut();
};

const Sidebar = ({ activeView, setView, permissions }: SidebarProps) => {

  // area: 表示に必要な画面権限 / admin: 管理者のみ
  const allNavItems: { id: ViewType; label: string; icon: typeof ClipboardList; area?: keyof PermissionSet; admin?: boolean }[] = [
    { id: 'projects', label: 'プロジェクト一覧', icon: ClipboardList, area: 'projects' },
    { id: 'works', label: '作品別収支', icon: Clapperboard, area: 'projects' },
    { id: 'clients', label: 'クライアント管理', icon: Users, area: 'clients' },
    { id: 'vendors', label: '外注先管理', icon: Truck, area: 'clients' },
    { id: 'ledger', label: '出納帳', icon: BookText, area: 'ledger' },
    { id: 'ledger-search', label: '証憑検索', icon: FileSearch, area: 'ledger' },
    { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard, area: 'dashboard' },
    { id: 'permissions', label: 'アクセス権限', icon: KeyRound, admin: true },
    { id: 'logs', label: '実行ログ・変更履歴', icon: History, admin: true },
    { id: 'settings', label: '会社設定', icon: Settings, admin: true },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.admin) return permissions?.isAdmin === true;
    const pagePerm = item.area ? permissions?.permissions?.[item.area] : undefined;
    return !!pagePerm && pagePerm !== 'disabled';
  });

  return (
    <aside className="flex flex-col flex-shrink-0 w-60 min-w-0 glass-sidebar no-print">
      <div className="flex items-center justify-center h-16 border-b border-white/20">
        <div className="flex items-center space-x-2">
          <img src="/favicon.png" alt="Logo" className="object-contain w-7 h-7" />
          <h1 className="text-lg font-bold text-earth-800">++Owl Ledger..</h1>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeView === item.id ? 'bg-earth-500 text-white shadow-md transform scale-[1.02]' : 'text-earth-700 hover:bg-white/40 hover:text-earth-900'}`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="ml-3">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 space-y-1 border-t border-white/20">
        <a
          href="https://shimaenaga-note-final.web.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-earth-700 transition-all duration-200 rounded-lg hover:bg-white/40 hover:text-earth-900"
        >
          <img src="/favicon_ena.png" alt="Enaga Board" className="object-contain w-5 h-5" />
          <span className="ml-3">++Enaga Board..</span>
        </a>

        <a
          href="https://swift-reserve2.web.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-earth-700 transition-all duration-200 rounded-lg hover:bg-white/40 hover:text-earth-900"
        >
          <img src="/SwiftReserve_faviconA.png" alt="Swift Reserve" className="object-contain w-5 h-5" />
          <span className="ml-3">++Swift Reserve..</span>
        </a>

        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-earth-700 transition-all duration-200 rounded-lg hover:bg-white/40 hover:text-earth-900"
        >
          <LogOut className="w-5 h-5" />
          <span className="ml-3">ログアウト</span>
        </button>

        {/* ★ 追加: バージョン情報の表示 */}
        <div className="pt-2 text-center">
          <span className="font-mono text-xs text-gray-400">ver.{APP_VERSION}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;