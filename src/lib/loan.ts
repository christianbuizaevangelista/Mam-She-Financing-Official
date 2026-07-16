import dayjs from 'dayjs';
import type { Loan, PaymentFrequency, Repayment } from '../types';

/**
 * Microfinance flat-interest model (common for barangay / small-business lending).
 * Total interest = principal * monthlyRate * termMonths.
 * The total payable is split evenly across the number of installments.
 */

export function installmentsFor(frequency: PaymentFrequency, termMonths: number): number {
  switch (frequency) {
    case 'weekly':
      return Math.round(termMonths * 4);
    case 'biweekly':
      return Math.round(termMonths * 2);
    case 'monthly':
    default:
      return termMonths;
  }
}

/**
 * Number of installments for a loan. Manual loans store this directly as
 * `numTerms`; product loans derive it from frequency + termMonths.
 */
export function termCount(loan: Pick<Loan, 'numTerms' | 'frequency' | 'termMonths'>): number {
  return loan.numTerms ?? installmentsFor(loan.frequency, loan.termMonths);
}

/**
 * Convert a loan duration in months into a number of installments, based on
 * the payment frequency (approximating a month as 30 days for daily loans).
 */
export function monthsToInstallments(
  months: number,
  frequency: PaymentFrequency,
  intervalDays = 15
): number {
  const m = Math.max(0, months);
  switch (frequency) {
    case 'daily':
      return Math.max(1, Math.round((m * 30) / (intervalDays || 1)));
    case 'weekly':
      return Math.max(1, Math.round(m * 4));
    case 'biweekly':
    case 'bimonthly':
      return Math.max(1, Math.round(m * 2));
    case 'monthly':
    default:
      return Math.max(1, Math.round(m));
  }
}

export function totalInterest(principal: number, monthlyRate: number, termMonths: number): number {
  return principal * monthlyRate * termMonths;
}

export function totalPayable(principal: number, monthlyRate: number, termMonths: number): number {
  return principal + totalInterest(principal, monthlyRate, termMonths);
}

export function installmentAmount(
  loan: Pick<Loan, 'principal' | 'monthlyRate' | 'termMonths' | 'frequency' | 'numTerms'>
): number {
  const n = termCount(loan);
  return n > 0 ? totalPayable(loan.principal, loan.monthlyRate, loan.termMonths) / n : 0;
}

function addPeriod(
  date: dayjs.Dayjs,
  loan: Pick<Loan, 'frequency' | 'intervalDays'>,
  i: number
): dayjs.Dayjs {
  switch (loan.frequency) {
    case 'daily':
      return date.add(i * (loan.intervalDays ?? 1), 'day');
    case 'weekly':
      return date.add(i * 7, 'day');
    case 'biweekly':
      return date.add(i * 14, 'day');
    case 'bimonthly':
      return date.add(i * 15, 'day'); // twice a month
    case 'monthly':
    default:
      return date.add(i, 'month');
  }
}

/** Build the amortization schedule for a disbursed loan. */
export function buildSchedule(loan: Loan, idPrefix = ''): Repayment[] {
  const start = dayjs(loan.disbursementDate ?? loan.applicationDate);
  const n = termCount(loan);
  const perInstallment = installmentAmount(loan);
  const schedule: Repayment[] = [];
  for (let i = 1; i <= n; i++) {
    schedule.push({
      id: `${idPrefix || loan.id}-r${i}`,
      loanId: loan.id,
      installmentNo: i,
      dueDate: addPeriod(start, loan, i).toISOString(),
      amountDue: round2(perInstallment),
      amountPaid: 0,
      status: 'pending',
    });
  }
  return schedule;
}

/** Guarantors for a loan, falling back to the legacy single-guarantor fields. */
export function loanGuarantors(loan: Loan): { name: string; email?: string; phone?: string }[] {
  if (loan.guarantors?.length) return loan.guarantors;
  if (loan.guarantor) return [{ name: loan.guarantor, email: loan.guarantorEmail, phone: loan.guarantorPhone }];
  if (loan.officer) return [{ name: loan.officer }];
  return [];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Aggregates for a single loan given its repayments. */
export function loanSummary(loan: Loan, repayments: Repayment[]) {
  const rows = repayments.filter((r) => r.loanId === loan.id);
  const total = totalPayable(loan.principal, loan.monthlyRate, loan.termMonths);
  const paid = rows.reduce((s, r) => s + r.amountPaid, 0);
  const outstanding = Math.max(0, total - paid);
  const overdue = rows.filter((r) => r.status === 'overdue');
  const overdueAmount = overdue.reduce((s, r) => s + (r.amountDue - r.amountPaid), 0);
  const nextDue = rows
    .filter((r) => r.status === 'pending' || r.status === 'partial' || r.status === 'overdue')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const progress = total > 0 ? paid / total : 0;
  return { rows, total, paid, outstanding, overdue, overdueAmount, nextDue, progress };
}

/** Recompute repayment status vs. "today". A loan payment is overdue if past due & unpaid. */
export function refreshRepaymentStatus(r: Repayment, today = dayjs()): Repayment {
  if (r.amountPaid >= r.amountDue - 0.001) return { ...r, status: 'paid' };
  const past = dayjs(r.dueDate).isBefore(today, 'day');
  if (r.amountPaid > 0) return { ...r, status: past ? 'overdue' : 'partial' };
  return { ...r, status: past ? 'overdue' : 'pending' };
}
