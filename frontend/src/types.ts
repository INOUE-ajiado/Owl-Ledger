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
  // 作品別収支への紐付け (任意)
  workId?: string;
  episode?: number;        // 話数 (0 または未設定は作品共通)
  costCategory?: CostCategory;
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

export type ViewType = 'dashboard' | 'projects' | 'works' | 'clients' | 'vendors' | 'ledger' | 'ledger-search' | 'permissions' | 'logs' | 'settings';

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
  targetType: 'project' | 'client' | 'vendor' | 'ledger' | 'settings' | 'staff' | 'permissions' | 'invoice' | 'work';
  targetId: string;
  targetLabel: string;
  action: 'create' | 'update' | 'delete';
  changes: FieldChange[];
}
// ---- 作品別収支 (works) ----

// 工程別の予算枠 (プリプロ / 作画・仕上・背景・3D / 撮影・特効・編集 / 音響 / 制作進行諸費)
export type CostCategory = 'prepro' | 'animation' | 'photography' | 'sound' | 'production';

export type DeliveryStatus = '未着手' | '進行中' | '納品完了' | '検収完了';
export type MilestoneInvoiceStatus = '未起票' | '下書き' | '発行済' | '入金済';

// 分割請求の節目 (契約時・コンテ/設定UP・アフレコ/中間・完パケ/納品 など)
export interface WorkMilestone {
  id: string;
  name: string;
  deliverable: string;       // 納品物 (例: 本編納品)
  amount: number;            // 請求額 (税抜)
  plannedDate: string;       // 節目の予定日
  deliveryStatus: DeliveryStatus;
  trigger: '納品完了' | '検収完了'; // この状態になったら請求書の下書きを起票する
  invoiceStatus: MilestoneInvoiceStatus;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;          // 入金予定日
  paidDate?: string;         // 入金 (消込) 日
}

export interface WorkEpisode {
  no: number;     // #1, #2 ...
  title?: string;
  budget: number;
}

export type LicenseChannel = '国内配信' | '海外配給' | 'パッケージ' | '商品化' | 'イベント' | 'タイアップ' | 'その他';
export type SupervisionStatus = '対象外' | '未着手' | '監修中' | '修正依頼' | '監修OK';

// ロイヤリティ報告 (期ごと): 報告書の受領 → 請求 → 入金確認
export interface RoyaltyReport {
  id: string;
  period: string;     // 対象期間 (例: 2026年4-6月)
  dueDate: string;    // 報告期日
  amount: number;     // 報告されたロイヤリティ額
  received: boolean;  // 報告書受領
  invoiced: boolean;
  paid: boolean;
  paidDate?: string;
}

export interface LicenseDeal {
  id: string;
  channel: LicenseChannel;
  licensee: string;    // 許諾先・窓口
  title: string;       // 案件名・商品名
  mg: number;          // ミニマムギャランティ (前受金)
  mgDueDate?: string;
  mgPaid: boolean;
  royaltyRate?: number; // %
  termStart?: string;
  termEnd?: string;
  supervision: SupervisionStatus;
  supervisionInvoiced: boolean; // 監修OKで請求済み
  reports: RoyaltyReport[];
  remarks?: string;
}

export interface CommitteeMember {
  name: string;
  ratio: number; // 出資比率 %
}

export interface WorkKeyDate {
  label: string;
  date: string;
}

export interface WorkContract {
  id: string;
  name: string;  // 製作受託契約書 など
  url: string;   // 契約書ファイルへのリンク (Google Drive など)
  signedDate?: string;
  renewalDate?: string;
}

export interface Work {
  id: string;
  title: string;
  status: '企画' | '制作中' | '放送・配信中' | '完了';
  client: string;             // 発注元 (製作委員会・幹事会社など)
  contractTotal: number;      // 制作受託の契約総額 (税抜)
  openingBalance: number;     // 作品に充てる手元資金 (キャッシュギャップの起点)
  originalWork: string;       // 原作
  publisher: string;          // 出版社
  committee: CommitteeMember[];
  ownShare: number;           // 自社の権利比率 %
  keyDates: WorkKeyDate[];
  contracts: WorkContract[];
  milestones: WorkMilestone[];
  categoryBudgets: Record<CostCategory, number>;
  episodes: WorkEpisode[];
  licenses: LicenseDeal[];
  remarks?: string;
  createdAt?: { seconds: number; nanoseconds: number; };
}

// 作品の原価 (外注請求書・支払予定)。works/{workId}/costs
export interface WorkCost {
  id: string;
  date: string;          // 支払日 (予定)
  payee: string;
  description: string;
  category: CostCategory;
  episode: number;       // 0 は作品共通
  amount: number;        // 税抜
  paid: boolean;
  vendorId?: string;
}
