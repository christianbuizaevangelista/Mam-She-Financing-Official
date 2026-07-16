import type { AppData, Branch, Client, Loan, LoanProduct, Repayment } from '../types';

/* Map between snake_case DB rows and camelCase domain objects. */

export const clientToRow = (c: Client) => ({
  id: c.id,
  first_name: c.firstName,
  last_name: c.lastName,
  phone: c.phone,
  email: c.email ?? null,
  address: c.address,
  city: c.city,
  business_type: c.businessType,
  id_type: c.idType,
  id_number: c.idNumber,
  status: c.status,
  credit_score: c.creditScore,
  branch: c.branch,
  created_at: c.createdAt,
  notes: c.notes ?? null,
  attachments: c.attachments ?? null,
  photo_url: c.photoUrl ?? null,
});

export const rowToClient = (r: any): Client => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  phone: r.phone ?? '',
  email: r.email ?? undefined,
  address: r.address ?? '',
  city: r.city ?? '',
  businessType: r.business_type ?? '',
  idType: r.id_type ?? '',
  idNumber: r.id_number ?? '',
  status: r.status,
  creditScore: r.credit_score,
  branch: r.branch ?? '',
  createdAt: r.created_at,
  notes: r.notes ?? undefined,
  attachments: r.attachments ?? undefined,
  photoUrl: r.photo_url ?? undefined,
});

export const productToRow = (p: LoanProduct) => ({
  id: p.id,
  name: p.name,
  monthly_rate: p.monthlyRate,
  term_months: p.termMonths,
  min_amount: p.minAmount,
  max_amount: p.maxAmount,
  frequency: p.frequency,
  active: p.active,
});

export const rowToProduct = (r: any): LoanProduct => ({
  id: r.id,
  name: r.name,
  monthlyRate: Number(r.monthly_rate),
  termMonths: r.term_months,
  minAmount: Number(r.min_amount),
  maxAmount: Number(r.max_amount),
  frequency: r.frequency,
  active: r.active,
});

export const loanToRow = (l: Loan) => ({
  id: l.id,
  client_id: l.clientId,
  product_id: l.productId ?? null,
  principal: l.principal,
  monthly_rate: l.monthlyRate,
  term_months: l.termMonths,
  num_terms: l.numTerms ?? null,
  interval_days: l.intervalDays ?? null,
  frequency: l.frequency,
  status: l.status,
  purpose: l.purpose,
  application_date: l.applicationDate,
  disbursement_date: l.disbursementDate ?? null,
  officer: l.officer ?? null,
  guarantor: l.guarantor ?? null,
  guarantor_email: l.guarantorEmail ?? null,
  guarantor_phone: l.guarantorPhone ?? null,
  attachments: l.attachments ?? null,
});

export const rowToLoan = (r: any): Loan => ({
  id: r.id,
  clientId: r.client_id,
  productId: r.product_id ?? undefined,
  principal: Number(r.principal),
  monthlyRate: Number(r.monthly_rate),
  termMonths: r.term_months,
  numTerms: r.num_terms ?? undefined,
  intervalDays: r.interval_days ?? undefined,
  frequency: r.frequency,
  status: r.status,
  purpose: r.purpose ?? '',
  applicationDate: r.application_date,
  disbursementDate: r.disbursement_date ?? undefined,
  officer: r.officer ?? undefined,
  guarantor: r.guarantor ?? undefined,
  guarantorEmail: r.guarantor_email ?? undefined,
  guarantorPhone: r.guarantor_phone ?? undefined,
  attachments: r.attachments ?? undefined,
});

export const repaymentToRow = (r: Repayment) => ({
  id: r.id,
  loan_id: r.loanId,
  installment_no: r.installmentNo,
  due_date: r.dueDate,
  amount_due: r.amountDue,
  amount_paid: r.amountPaid,
  paid_date: r.paidDate ?? null,
  status: r.status,
});

export const rowToRepayment = (r: any): Repayment => ({
  id: r.id,
  loanId: r.loan_id,
  installmentNo: r.installment_no,
  dueDate: r.due_date,
  amountDue: Number(r.amount_due),
  amountPaid: Number(r.amount_paid),
  paidDate: r.paid_date ?? undefined,
  status: r.status,
});

export const branchToRow = (b: Branch) => ({ id: b.id, name: b.name, address: b.address });
export const rowToBranch = (r: any): Branch => ({ id: r.id, name: r.name, address: r.address ?? '' });

export const emptyData = (): AppData => ({ clients: [], products: [], loans: [], repayments: [], branches: [] });
