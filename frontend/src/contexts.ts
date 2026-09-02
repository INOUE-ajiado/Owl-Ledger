import { createContext, useContext } from 'react';
import { useOutletContext } from 'react-router-dom'; // ★ 追加
import type { User } from 'firebase/auth';
import type { UserPermissions, ModalOptions, PageHeaderProps } from './types';

// Auth Context
interface AuthContextType {
  user: User | null;
  permissions: UserPermissions | null;
}
export const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

// Modal Context
interface ModalContextType {
  showModal: (options: ModalOptions) => void;
}
export const ModalContext = createContext<ModalContextType | null>(null);
export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
};

// Outlet Context
export type OutletContextType = {
  setHeaderProps: (props: PageHeaderProps) => void;
  permissions: UserPermissions | null;
};

// ★ App.tsxからここに移動
export function useAppOutletContext() {
  return useOutletContext<OutletContextType>();
}