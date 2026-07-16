import dayjs from 'dayjs';
import type { AppData, Loan, Repayment } from '../types';
import { loanSummary, totalPayable } from './loan';

const DISBURSED: Loan['status'][] = ['active', 'overdue', 'paid', 'defaulted'];
const OPEN: Loan['status'][] = ['active', 'overdue'];

export function portfolioMetrics(data: AppData) {
  const { loans, repayments, clients } = data;

  const disbursedLoans = loans.filter((l) => DISBURSED.includes(l.status));
  const openLoans = loans.filter((l) => OPEN.includes(l.status));

  const totalDisbursed = disbursedLoans.reduce((s, l) => s + l.principal, 0);

  let outstanding = 0;
  let overduePrincipal = 0;
  for (const loan of openLoans) {
    const sum = loanSummary(loan, repayments);
    outstanding += sum.outstanding;
    if (loan.status === 'overdue') overduePrincipal += sum.outstanding;
  }

  const activeBorrowers = new Set(openLoans.map((l) => l.clientId)).size;

  // Collections this month (by paidDate).
  const startMonth = dayjs().startOf('month');
  const collectionsThisMonth = repayments
    .filter((r) => r.paidDate && dayjs(r.paidDate).isAfter(startMonth))
    .reduce((s, r) => s + r.amountPaid, 0);

  const expectedInterest = disbursedLoans.reduce(
    (s, l) => s + (totalPayable(l.principal, l.monthlyRate, l.termMonths) - l.principal),
    0
  );

  // Portfolio at risk = outstanding tied to overdue loans / total outstanding.
  const par = outstanding > 0 ? overduePrincipal / outstanding : 0;

  const overdueRepayments = repayments.filter((r) => r.status === 'overdue');
  const overdueAmount = overdueRepayments.reduce((s, r) => s + (r.amountDue - r.amountPaid), 0);

  return {
    totalDisbursed,
    outstanding,
    activeLoans: openLoans.length,
    activeBorrowers,
    totalClients: clients.length,
    collectionsThisMonth,
    expectedInterest,
    par,
    overdueAmount,
    overdueCount: overdueRepayments.length,
  };
}

export function dueBuckets(repayments: Repayment[]) {
  const today = dayjs().startOf('day');
  const endWeek = today.add(7, 'day');
  const open = repayments.filter((r) => r.status !== 'paid');
  const dueToday = open.filter((r) => dayjs(r.dueDate).isSame(today, 'day'));
  const dueThisWeek = open.filter((r) => {
    const d = dayjs(r.dueDate);
    return d.isAfter(today) && d.isBefore(endWeek);
  });
  const overdue = open.filter((r) => r.status === 'overdue');
  return { dueToday, dueThisWeek, overdue };
}

/** Monthly disbursement vs collection series for the last N months. */
export function monthlySeries(data: AppData, months = 6) {
  const out: { month: string; disbursed: number; collected: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = dayjs().subtract(i, 'month');
    const start = m.startOf('month');
    const end = m.endOf('month');
    const disbursed = data.loans
      .filter((l) => l.disbursementDate && dayjs(l.disbursementDate).isAfter(start) && dayjs(l.disbursementDate).isBefore(end))
      .reduce((s, l) => s + l.principal, 0);
    const collected = data.repayments
      .filter((r) => r.paidDate && dayjs(r.paidDate).isAfter(start) && dayjs(r.paidDate).isBefore(end))
      .reduce((s, r) => s + r.amountPaid, 0);
    out.push({ month: m.format('MMM'), disbursed, collected });
  }
  return out;
}

function sumDisbursed(data: AppData, s: dayjs.Dayjs, e: dayjs.Dayjs): number {
  return data.loans
    .filter((l) => l.disbursementDate && dayjs(l.disbursementDate).isAfter(s) && dayjs(l.disbursementDate).isBefore(e))
    .reduce((sum, l) => sum + l.principal, 0);
}

function sumCollected(data: AppData, s: dayjs.Dayjs, e: dayjs.Dayjs): number {
  return data.repayments
    .filter((r) => r.paidDate && dayjs(r.paidDate).isAfter(s) && dayjs(r.paidDate).isBefore(e))
    .reduce((sum, r) => sum + r.amountPaid, 0);
}

/**
 * Disbursed vs collected series that follows the selected date range:
 * day buckets for ranges up to ~a month, month buckets beyond that.
 * Falls back to the last 6 months when no range is selected.
 */
export function rangeSeries(
  data: AppData,
  range: { start: number; end: number } | null
): { label: string; disbursed: number; collected: number; bucket: 'day' | 'month' }[] {
  if (!range || !Number.isFinite(range.start) || !Number.isFinite(range.end)) {
    return monthlySeries(data, 6).map((m) => ({ ...m, label: m.month, bucket: 'month' as const }));
  }
  const start = dayjs(range.start).startOf('day');
  const end = dayjs(range.end).endOf('day');
  const days = end.diff(start, 'day') + 1;
  const out: { label: string; disbursed: number; collected: number; bucket: 'day' | 'month' }[] = [];

  if (days <= 31) {
    for (let i = 0; i < days; i++) {
      const d = start.add(i, 'day');
      out.push({
        label: d.format('MMM D'),
        disbursed: sumDisbursed(data, d.startOf('day'), d.endOf('day')),
        collected: sumCollected(data, d.startOf('day'), d.endOf('day')),
        bucket: 'day',
      });
    }
    return out;
  }

  let m = start.startOf('month');
  while (m.isBefore(end)) {
    out.push({
      label: m.format('MMM YY'),
      disbursed: sumDisbursed(data, m.startOf('month'), m.endOf('month')),
      collected: sumCollected(data, m.startOf('month'), m.endOf('month')),
      bucket: 'month',
    });
    m = m.add(1, 'month');
  }
  return out;
}

export function loanStatusBreakdown(data: AppData) {
  const counts: Record<string, number> = {};
  for (const l of data.loans) counts[l.status] = (counts[l.status] ?? 0) + 1;
  return counts;
}
