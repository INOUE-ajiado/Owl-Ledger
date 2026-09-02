import { auth } from '../api/firebase';
import type { UserPermissions, PermissionSet, ViewType } from '../types';
import { APP_VERSION } from '../version';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BookText,
  KeyRound,
  LogOut,
  History
} from 'lucide-react';

interface SidebarProps {
  activeView: ViewType;
  setView: (view: ViewType) => void;
  permissions: UserPermissions | null;
}

const Sidebar = ({ activeView, setView, permissions }: SidebarProps) => {

  const allNavItems = [
    { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { id: 'projects', label: 'プロジェクト一覧', icon: ClipboardList },
    { id: 'clients', label: 'クライアント管理', icon: Users },
    { id: 'ledger', label: '出納帳', icon: BookText },
    { id: 'permissions', label: 'アクセス権限', icon: KeyRound },
    { id: 'logs', label: '実行ログ', icon: History },
  ];

  const navItems = allNavItems.filter(item => {

    // システム管理権限 (permissions) の値を取得
    const systemPerm = permissions?.permissions?.permissions;

    // その他のページ（dashboard, projects, clients, ledger）の権限値を取得
    const pagePerm = permissions?.permissions?.[item.id as keyof PermissionSet];

    // --- フィルターロジック ---

    if (item.id === 'permissions' || item.id === 'logs') {
      // 'permissions' と 'logs' は systemPerm に依存
      if (systemPerm !== 'write') {
        return false;
      }
      return true;
    }

    // その他のページは pagePerm に依存
    if (!pagePerm || pagePerm === 'disabled') {
      return false;
    }

    return true;
  });

  return (
    <aside className="flex flex-col flex-shrink-0 w-60 min-w-0 glass-sidebar no-print">
      <div className="flex items-center justify-center h-16 border-b border-white/20">
        <div className="flex items-center space-x-2">
          <img src="/favicon.png" alt="Logo" className="object-contain w-7 h-7" />
          <h1 className="text-lg font-bold text-earth-800">++Owl Ledger..</h1>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewType)}
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
          onClick={() => auth.signOut()}
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