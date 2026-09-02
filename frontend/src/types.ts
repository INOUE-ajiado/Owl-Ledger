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
}

export interface FixedInvoiceData {
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  unitPrice: number;
}

export interface Project {
  id: string;
  projectId: string;
  registrationDate: string;
  dueDate?: string;
  title: string;
  workerName: string;
  category: string;
  clientId: string;
  clientName: string;
  status: '進行中' | '完了' | '請求済' | '削除済み';
  remarks?: string;
  previewPassword?: string;
  taxType: 'inclusive' | 'exclusive';
  isFixed?: boolean;
  fixedInvoiceData?: FixedInvoiceData;
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
  issuedAt: { seconds: number; nanoseconds: number; };
  password?: string;
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

export type ViewType = 'dashboard' | 'projects' | 'clients' | 'ledger' | 'permissions' | 'logs';