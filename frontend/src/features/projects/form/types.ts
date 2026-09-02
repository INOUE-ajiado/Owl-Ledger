import type { BreakdownItem } from '../../../types';

export type ProjectFormValues = {
  projectType: 'standard' | 'master' | 'sub' | 'internal_sale';
  registrationDate: string;
  dueDate: string;
  title: string;
  clientId: string;
  projectId: string;
  status: '進行中' | '完了' | '請求済';
  remarks: string;
  workerName: string;
  category: string;
  masterProjectId?: string;
  gloss: number;
  allocatedAmount: number;
  totalBudget: number;
  taxType: 'inclusive' | 'exclusive';
  marginRate: number;
  characterCount: number;
  negotiationFeeRate: number;
  breakdown: BreakdownItem[];
  margin?: string;
  net?: string;
  netUnitPrice?: string;
  negotiationFee?: string;
  netRate?: number;
};