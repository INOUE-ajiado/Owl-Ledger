import { useSyncExternalStore } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../api/firebase';
import type { CompanySettings } from '../types';
import { DEFAULT_TAX_RATE } from '../utils/money';

export const EMPTY_COMPANY_SETTINGS: CompanySettings = {
  companyName: '',
  postalCode: '',
  address: '',
  tel: '',
  registrationNumber: '',
  bankName: '',
  branchName: '',
  accountType: '普通',
  accountNumber: '',
  accountHolder: '',
  accountHolderKana: '',
  logoUrl: '',
  sealUrl: '',
  taxRate: DEFAULT_TAX_RATE,
  monthlySalesGoal: 0,
  paymentTerms: '',
  approverStampName: '',
};

export const companySettingsRef = () => doc(db, 'settings', 'company');

type State = { settings: CompanySettings; loaded: boolean; error: boolean };

// 会社設定はアプリ全体で1つの購読を共有する (帳票ごとに読み直さない)
let state: State = { settings: EMPTY_COMPANY_SETTINGS, loaded: false, error: false };
let started = false;
const listeners = new Set<() => void>();

const setState = (next: State) => {
  state = next;
  listeners.forEach(l => l());
};

// ログイン状態 (匿名ログインを含む) が変わるたびに購読し直す。
// 印刷・承認ページは匿名ログインの完了前に描画されるため、未ログインで失敗したままにしない
const start = () => {
  if (started) return;
  started = true;
  let stopSnapshot: (() => void) | null = null;
  onAuthStateChanged(auth, (user) => {
    stopSnapshot?.();
    stopSnapshot = null;
    if (!user) return;
    stopSnapshot = onSnapshot(companySettingsRef(), (snap) => {
      const data = snap.exists() ? snap.data() as Partial<CompanySettings> : {};
      const taxRate = Number(data.taxRate);
      setState({
        settings: {
          ...EMPTY_COMPANY_SETTINGS,
          ...data,
          taxRate: Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : DEFAULT_TAX_RATE,
          monthlySalesGoal: Number(data.monthlySalesGoal) || 0,
        },
        loaded: true,
        error: false,
      });
    }, (error) => {
      console.error('会社設定の読み込みに失敗しました:', error);
      setState({ ...state, loaded: true, error: true });
    });
  });
};

const subscribe = (listener: () => void) => {
  start();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useCompanySettings = () => useSyncExternalStore(subscribe, () => state);
