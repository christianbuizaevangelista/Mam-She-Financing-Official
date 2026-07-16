export type ID = string;

export type ClientStatus = 'active' | 'inactive' | 'blacklisted';

export interface Client {
  id: ID;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  businessType: string;
  idType: string;
  idNumber: string;
  status: ClientStatus;
  creditScore: number; // 300 - 850
  branch: string;
  createdAt: string; // ISO date
  notes?: string;
  attachments?: Attachment[]; // supporting documents (IDs, permits, etc.)
  photoUrl?: string; // profile photo (resized data URL)
}

export type PaymentFrequency = 'daily' | 'weekly' | 'biweekly' | 'bimonthly' | 'monthly';

export interface LoanProduct {
  id: ID;
  name: string;
  monthlyRate: number; // e.g. 0.03 for 3%/month (flat)
  termMonths: number;
  minAmount: number;
  maxAmount: number;
  frequency: PaymentFrequency;
  active: boolean;
}

export interface Attachment {
  name: string;
  size: number; // bytes
}

/** Backward-compatible alias (loans referenced this name first). */
export type LoanAttachment = Attachment;

export type LoanStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'paid'
  | 'overdue'
  | 'rejected'
  | 'defaulted';

export interface Loan {
  id: ID;
  clientId: ID;
  productId?: ID; // optional — custom manual loans have no preset product
  principal: number;
  // For product loans this is the flat rate per month; for manual loans it is
  // the interest rate per payment term (see numTerms). termCount() + the flat
  // formula (principal * monthlyRate * termMonths) stay consistent either way.
  monthlyRate: number;
  termMonths: number;
  numTerms?: number; // explicit number of installments (manual loans)
  intervalDays?: number; // spacing in days when frequency === 'daily'
  frequency: PaymentFrequency;
  status: LoanStatus;
  purpose: string;
  applicationDate: string; // ISO
  disbursementDate?: string; // ISO
  officer?: string; // legacy loan-officer field
  guarantor?: string; // person guaranteeing the loan
  guarantorEmail?: string; // used for past-due reminders to the guarantor
  guarantorPhone?: string;
  attachments?: LoanAttachment[]; // supporting documents
}

export type RepaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue';

export interface Repayment {
  id: ID;
  loanId: ID;
  installmentNo: number;
  dueDate: string; // ISO
  amountDue: number;
  amountPaid: number;
  paidDate?: string; // ISO
  status: RepaymentStatus;
}

export interface Branch {
  id: ID;
  name: string;
  address: string;
}

export interface AppData {
  clients: Client[];
  products: LoanProduct[];
  loans: Loan[];
  repayments: Repayment[];
  branches: Branch[];
}
