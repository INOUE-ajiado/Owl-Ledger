export interface Client {
  id: string;
  clientCode: string;
  name: string;
  nameAbbr: string;
  postalCode: string;
  address: string;
  building?: string;
  department?: string;
  contactPerson?: string;
  zip?: string;
  address1?: string;
  address2?: string;
  bankName?: string;
  branchName?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export interface BreakdownItem {
  name: string;
  percentage: number;
  content?: string;
  quantity: number;
  amount: number;
  id?: string;
  originalIndex?: number;
  vendorId?: string; // 外注先マスタの ID (通常・子プロジェクトの内訳)
}

export interface FixedInvoiceData {
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  unitPrice: number;
  invoiceNumber?: string; // 未設定は旧データ (伝票IDを請求書番号として発行済み)
  taxRate?: number;
  fixedAt?: string;
  fixedBy?: string;
}

// 取消済みの請求書。赤伝 (マイナス請求書) を発行した場合はその番号も残す
export interface InvoiceRecord extends FixedInvoiceData {
  cancelledAt: string;
  cancelledBy: string;
  cancelReason: string;
  creditNoteNumber?: string;
  creditNoteIssueDate?: string;
}

export interface Project {
  id: string;
  projectId: string;
  registrationDate: string;
  dueDate?: string;
  title: string;
  workerName: string;
  copyrightManager?: string; // 版権担当者 (見積書・請求書に印字)
  category: string;
  clientId: string;
  clientName: string;
  status: '進行中' | '完了' | '請求済' | '削除済み';
  remarks?: string;
  previewPassword?: string; // 旧形式 (平文)。新規はハッシュで保存
  previewPasswordHash?: string;
  taxType: 'inclusive' | 'exclusive';
  isFixed?: boolean;
  fixedInvoiceData?: FixedInvoiceData;
  invoiceHistory?: InvoiceRecord[];
  quotationNumber?: string;
  characterCount: number;
  gloss: number;
  marginRate: number;
  negotiationFeeRate: number;
  breakdown: BreakdownItem[];
  deletedAt?: { seconds: number; nanoseconds: number; };
  deletionReason?: string;
  orderConfirmationStatus?: '承認待ち' | '承認済み';
  orderConfirmationSubmittedAt?: { seconds: number; nanoseconds: number; };
  orderConfirmationSubmitterName?: string;
  orderConfirmationSubmitterUid?: string;
  orderConfirmationApprovedAt?: { seconds: number; nanoseconds: number; };
  orderConfirmationApproverName?: string;
  purchaseOrderGrouping?: { id: string, indices: number[] }[];
  projectType: 'standard' | 'master' | 'sub' | 'internal_sale';
  totalBudget?: number;
  masterProjectId?: string;
  allocatedAmount?: number;
  costPrice?: number;
  firstQuotationDate?: string;
}

export interface PurchaseOrder {
  id: string;
  workerName: string;
  amount: number;
  vendorId?: string;
  poNumber?: string;
  staffName?: string; // 発注書の担当者
  vendorType?: VendorType;
  invoiceRegistrationNumber?: string;
  taxRate?: number;
  tax?: number;
  withholdingTax?: number;
  paymentAmount?: number;
  issuedAt: { seconds: number; nanoseconds: number; };
  password?: string; // 旧形式 (平文)。新規はハッシュで保存
  passwordHash?: string;
  includedIndices: number[];
  vendorName?: string;
  issueDate?: string;
  projectId?: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  subject: string[];
  description: string;
  payee: string;
  income: number;
  expense: number;
  receiptImageUrl?: string;
}

export interface LedgerReport {
  id: string;
  reportNumber: number;
  month: string;
  userId: string;
  status: '作成中' | '承認待ち' | '承認済み' | '経理提出済み';
  entries: LedgerEntry[];
  submittedAt?: { seconds: number; nanoseconds: number; };
  submitterName?: string;
  submitterUid?: string;
  approvedAt?: { seconds: number; nanoseconds: number; };
  approverName?: string;
  accountingSubmittedAt?: { seconds: number; nanoseconds: number; };
}

export interface LedgerSubject {
  id: string;
  name: string;
}

export interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export interface PermissionSet {
  dashboard: 'read' | 'write' | 'disabled';
  projects: 'read' | 'write' | 'disabled';
  clients: 'read' | 'write' | 'disabled';
  ledger: 'read' | 'write' | 'disabled';
  permissions: 'read' | 'write' | 'disabled';
}

export interface UserPermissions {
  email: string;
  uid: string;
  permissions: PermissionSet;
  isAdmin?: boolean;
}

export interface ModalOptions {
  title: string;
  message: string;
  isLoading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: 'info' | 'confirm' | 'error';
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: { seconds: number; nanoseconds: number; };
}

export interface ActivityLog {
  id: string;
  timestamp: { seconds: number; nanoseconds: number; };
  userEmail: string;
  userId: string;
  action: 'CREATE_PROJECT' | 'UPDATE_PROJECT' | 'DELETE_PROJECT' | 'SUBMIT_LEDGER' | 'APPROVE_LEDGER' | 'OCR_FAILED' | string;
  targetType: 'project' | 'ledger' | 'system' | 'client';
  targetId: string;
  summary: string;
  details?: string;
  status: 'success' | 'error' | 'info';
}

export type ViewType = 'dashboard' | 'projects' | 'clients' | 'vendors' | 'ledger' | 'ledger-search' | 'permissions' | 'logs' | 'settings';

// 会社設定 (settings/company)。帳票の発行元・振込先・税率などをコードに書かず管理する
export interface CompanySettings {
  companyName: string;
  postalCode: string;
  address: string;
  tel: string;
  registrationNumber: string; // 適格請求書発行事業者の登録番号
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  accountHolderKana: string;
  logoUrl: string;
  sealUrl: string;
  taxRate: number; // %
  monthlySalesGoal: number;
  paymentTerms: string; // 発注書の支払条件
  approverStampName: string; // ログインせずに承認した場合の承認印の名前
}

// 社員マスタ (staff)。ログインしない人も版権担当者・発注担当者として登録できる
export interface Staff {
  id: string;
  name: string;      // 帳票に載せる氏名 (例: 井上 賢治)
  stampName: string; // 承認印に入れる名前 (例: 井上)
  email?: string;    // ログインユーザーと紐付ける場合
  active: boolean;
  sortOrder?: number;
}

export type VendorType = 'individual' | 'corporate';

// 外注先 (作業者) マスタ (vendors)
export interface Vendor {
  id: string;
  name: string;
  kana?: string;
  type: VendorType;
  invoiceRegistrationNumber?: string;
  withholding: boolean; // 源泉徴収の対象
  email?: string;
  tel?: string;
  postalCode?: string;
  address?: string;
  bankName?: string;
  branchName?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolder?: string;
  aliases?: string[]; // 過去の内訳に残る表記ゆれ (名寄せ用)
  remarks?: string;
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

// 変更履歴 (changeHistory)。何をどう変えたかを残す (追記のみ)
export interface ChangeHistory {
  id: string;
  timestamp: { seconds: number; nanoseconds: number; };
  userEmail: string;
  userId: string;
  targetType: 'project' | 'client' | 'vendor' | 'ledger' | 'settings' | 'staff' | 'permissions' | 'invoice';
  targetId: string;
  targetLabel: string;
  action: 'create' | 'update' | 'delete';
  changes: FieldChange[];
}