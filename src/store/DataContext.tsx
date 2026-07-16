import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import type { AppData, Client, Loan, LoanProduct, Repayment } from '../types';
import { seedData } from '../data/seed';
import { buildSchedule, loanSummary, refreshRepaymentStatus, monthsToInstallments } from '../lib/loan';
import { isSupabaseConfigured } from '../lib/supabase';
import { emptyData } from '../lib/mappers';
import * as repo from './repo';

const STORAGE_KEY = 'mamshe.data.v1';

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppData;
  } catch {
    /* ignore */
  }
  return seedData;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Recompute overdue statuses relative to today. Returns next data + the rows that changed. */
function refreshStatuses(data: AppData): { next: AppData; changedRepayments: Repayment[]; changedLoans: Loan[] } {
  const changedRepayments: Repayment[] = [];
  const repayments = data.repayments.map((r) => {
    if (r.status === 'paid') return r;
    const updated = refreshRepaymentStatus(r);
    if (updated.status !== r.status) changedRepayments.push(updated);
    return updated;
  });
  const changedLoans: Loan[] = [];
  const loans = data.loans.map((loan) => {
    if (loan.status === 'paid' || loan.status === 'rejected' || loan.status === 'defaulted') return loan;
    const hasOverdue = repayments.some((r) => r.loanId === loan.id && r.status === 'overdue');
    if (loan.status === 'active' && hasOverdue) {
      const next = { ...loan, status: 'overdue' as const };
      changedLoans.push(next);
      return next;
    }
    if (loan.status === 'overdue' && !hasOverdue) {
      const next = { ...loan, status: 'active' as const };
      changedLoans.push(next);
      return next;
    }
    return loan;
  });
  return { next: { ...data, repayments, loans }, changedRepayments, changedLoans };
}

interface DataContextValue extends AppData {
  loading: boolean;
  usingSupabase: boolean;
  syncError: string | null;
  addClient: (c: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  addLoan: (input: NewLoanInput) => Loan;
  setLoanStatus: (id: string, status: Loan['status']) => void;
  recordPayment: (repaymentId: string, amount: number) => void;
  recordLoanPayment: (loanId: string, amount: number) => void;
  addProduct: (p: Omit<LoanProduct, 'id'>) => void;
  updateProduct: (id: string, patch: Partial<LoanProduct>) => void;
  resetData: () => void;
  clientById: (id: string) => Client | undefined;
  productById: (id?: string) => LoanProduct | undefined;
  loanById: (id: string) => Loan | undefined;
  repaymentsForLoan: (loanId: string) => Repayment[];
  loansForClient: (clientId: string) => Loan[];
}

export interface NewLoanInput {
  clientId: string;
  principal: number;
  interestRate: number; // percent per month, e.g. 3 for 3%/mo
  numMonths: number; // loan duration in months
  frequency: import('../types').PaymentFrequency;
  intervalDays?: number; // used when frequency === 'daily'
  purpose: string;
  guarantor: string;
  guarantorEmail?: string;
  guarantorPhone?: string;
  attachments?: import('../types').LoanAttachment[];
  disburse: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [usingSupabase, setUsingSupabase] = useState(isSupabaseConfigured);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Ref so async action callbacks know whether to write through to Supabase.
  const remoteRef = useRef(isSupabaseConfigured);

  // Best-effort write-through; failures don't break the optimistic local update.
  // Supabase query builders are thenables, so accept any PromiseLike.
  const push = useCallback((op: () => PromiseLike<any>) => {
    if (!remoteRef.current) return;
    Promise.resolve(op())
      .then((res: any) => {
        if (res && res.error) console.error('Supabase write failed:', res.error);
      })
      .catch((e) => console.error('Supabase write failed:', e));
  }, []);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (isSupabaseConfigured) {
        try {
          if (await repo.isEmpty()) await repo.seedAll(seedData);
          const loaded = await repo.loadAll();
          const { next, changedRepayments, changedLoans } = refreshStatuses(loaded);
          if (cancelled) return;
          setData(next);
          setLoading(false);
          // Persist any status transitions back to Supabase (best effort).
          if (changedRepayments.length) Promise.resolve(repo.saveRepayments(changedRepayments)).catch(() => {});
          changedLoans.forEach((l) => Promise.resolve(repo.saveLoan(l)).catch(() => {}));
          return;
        } catch (e: any) {
          console.error('Supabase unavailable, using local storage:', e);
          if (cancelled) return;
          remoteRef.current = false;
          setUsingSupabase(false);
          setSyncError(e?.message ?? 'Supabase connection failed');
        }
      }
      // Local fallback / no Supabase configured.
      const { next } = refreshStatuses(loadLocal());
      if (!cancelled) {
        setData(next);
        setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist to localStorage only in local mode.
  useEffect(() => {
    if (loading || remoteRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, loading]);

  const addClient = useCallback((c: Omit<Client, 'id' | 'createdAt'>) => {
    const client: Client = { ...c, id: uid('c'), createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, clients: [client, ...prev.clients] }));
    push(() => repo.saveClient(client));
    return client;
  }, [push]);

  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    setData((prev) => {
      const updated = prev.clients.map((c) => (c.id === id ? { ...c, ...patch } : c));
      const target = updated.find((c) => c.id === id);
      if (target) push(() => repo.saveClient(target));
      return { ...prev, clients: updated };
    });
  }, [push]);

  const addLoan = useCallback((input: NewLoanInput) => {
    const now = dayjs();
    // Manual loan: interest is a flat rate per month over `numMonths`, and the
    // installment count is derived from the payment frequency. Total interest
    // stays principal * monthlyRate * termMonths.
    const monthlyRate = input.interestRate / 100;
    const numTerms = monthsToInstallments(input.numMonths, input.frequency, input.intervalDays ?? 15);
    const loan: Loan = {
      id: uid('l'),
      clientId: input.clientId,
      principal: input.principal,
      monthlyRate,
      termMonths: input.numMonths,
      numTerms,
      intervalDays: input.frequency === 'daily' ? input.intervalDays : undefined,
      frequency: input.frequency,
      status: input.disburse ? 'active' : 'pending',
      purpose: input.purpose,
      guarantor: input.guarantor,
      guarantorEmail: input.guarantorEmail || undefined,
      guarantorPhone: input.guarantorPhone || undefined,
      attachments: input.attachments && input.attachments.length ? input.attachments : undefined,
      applicationDate: now.toISOString(),
      disbursementDate: input.disburse ? now.toISOString() : undefined,
    };
    const schedule = input.disburse ? buildSchedule(loan, uid('r')) : [];
    setData((prev) => ({
      ...prev,
      loans: [loan, ...prev.loans],
      repayments: [...prev.repayments, ...schedule],
    }));
    // Write the loan first, then its schedule — the repayments FK references
    // the loan, so they must not race.
    push(async () => {
      const res: any = await repo.saveLoan(loan);
      if (res?.error) return res;
      if (schedule.length) return await repo.saveRepayments(schedule);
      return res;
    });
    return loan;
  }, [push]);

  const setLoanStatus = useCallback((id: string, status: Loan['status']) => {
    setData((prev) => {
      const loan = prev.loans.find((l) => l.id === id);
      if (!loan) return prev;
      if ((status === 'active' || status === 'approved') && loan.status === 'pending') {
        const disbursed: Loan = { ...loan, disbursementDate: new Date().toISOString(), status };
        const hasSchedule = prev.repayments.some((r) => r.loanId === id);
        const schedule = hasSchedule ? [] : buildSchedule(disbursed, uid('r'));
        push(() => repo.saveLoan(disbursed));
        if (schedule.length) push(() => repo.saveRepayments(schedule));
        return {
          ...prev,
          repayments: [...prev.repayments, ...schedule],
          loans: prev.loans.map((l) => (l.id === id ? disbursed : l)),
        };
      }
      const updated = { ...loan, status };
      push(() => repo.saveLoan(updated));
      return { ...prev, loans: prev.loans.map((l) => (l.id === id ? updated : l)) };
    });
  }, [push]);

  const recordPayment = useCallback((repaymentId: string, amount: number) => {
    setData((prev) => {
      let updatedRepayment: Repayment | undefined;
      const repayments = prev.repayments.map((r) => {
        if (r.id !== repaymentId) return r;
        const amountPaid = Math.min(r.amountDue, r.amountPaid + amount);
        updatedRepayment = refreshRepaymentStatus({ ...r, amountPaid, paidDate: new Date().toISOString() });
        return updatedRepayment;
      });
      if (updatedRepayment) push(() => repo.saveRepayment(updatedRepayment!));

      const target = prev.repayments.find((r) => r.id === repaymentId);
      let loans = prev.loans;
      if (target) {
        const loanRows = repayments.filter((r) => r.loanId === target.loanId);
        const allPaid = loanRows.length > 0 && loanRows.every((r) => r.status === 'paid');
        const hasOverdue = loanRows.some((r) => r.status === 'overdue');
        loans = prev.loans.map((l) => {
          if (l.id !== target.loanId) return l;
          let next = l;
          if (allPaid) next = { ...l, status: 'paid' as const };
          else if (l.status === 'overdue' && !hasOverdue) next = { ...l, status: 'active' as const };
          if (next !== l) push(() => repo.saveLoan(next));
          return next;
        });
      }
      return { ...prev, repayments, loans };
    });
  }, [push]);

  // Apply a lump-sum payment across a loan's unpaid installments, oldest first.
  // Lets a client settle several installments (or the full outstanding) at once.
  const recordLoanPayment = useCallback((loanId: string, amount: number) => {
    setData((prev) => {
      let remaining = amount;
      const changed = new Map<string, Repayment>();
      const ordered = prev.repayments
        .filter((r) => r.loanId === loanId)
        .sort((a, b) => a.installmentNo - b.installmentNo);
      for (const r of ordered) {
        if (remaining <= 0.001) break;
        const due = r.amountDue - r.amountPaid;
        if (due <= 0.001) continue;
        const pay = Math.min(due, remaining);
        remaining -= pay;
        changed.set(
          r.id,
          refreshRepaymentStatus({ ...r, amountPaid: r.amountPaid + pay, paidDate: new Date().toISOString() })
        );
      }
      if (changed.size === 0) return prev;
      const repayments = prev.repayments.map((r) => changed.get(r.id) ?? r);
      const loanRows = repayments.filter((r) => r.loanId === loanId);
      const allPaid = loanRows.length > 0 && loanRows.every((r) => r.status === 'paid');
      const hasOverdue = loanRows.some((r) => r.status === 'overdue');
      const loans = prev.loans.map((l) => {
        if (l.id !== loanId) return l;
        let next = l;
        if (allPaid) next = { ...l, status: 'paid' as const };
        else if (l.status === 'overdue' && !hasOverdue) next = { ...l, status: 'active' as const };
        if (next !== l) push(() => repo.saveLoan(next));
        return next;
      });
      push(() => repo.saveRepayments([...changed.values()]));
      return { ...prev, repayments, loans };
    });
  }, [push]);

  const addProduct = useCallback((p: Omit<LoanProduct, 'id'>) => {
    const product: LoanProduct = { ...p, id: uid('p') };
    setData((prev) => ({ ...prev, products: [...prev.products, product] }));
    push(() => repo.saveProduct(product));
  }, [push]);

  const updateProduct = useCallback((id: string, patch: Partial<LoanProduct>) => {
    setData((prev) => {
      const products = prev.products.map((p) => (p.id === id ? { ...p, ...patch } : p));
      const target = products.find((p) => p.id === id);
      if (target) push(() => repo.saveProduct(target));
      return { ...prev, products };
    });
  }, [push]);

  const resetData = useCallback(() => {
    if (remoteRef.current) {
      setLoading(true);
      repo
        .resetAll(seedData)
        .then(() => refreshStatuses(seedData))
        .then(({ next }) => {
          setData(next);
          setLoading(false);
        })
        .catch((e) => {
          console.error(e);
          setSyncError(e?.message ?? 'Reset failed');
          setLoading(false);
        });
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setData(refreshStatuses(seedData).next);
    }
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      loading,
      usingSupabase,
      syncError,
      addClient,
      updateClient,
      addLoan,
      setLoanStatus,
      recordPayment,
      recordLoanPayment,
      addProduct,
      updateProduct,
      resetData,
      clientById: (id) => data.clients.find((c) => c.id === id),
      productById: (id) => data.products.find((p) => p.id === id),
      loanById: (id) => data.loans.find((l) => l.id === id),
      repaymentsForLoan: (loanId) =>
        data.repayments.filter((r) => r.loanId === loanId).sort((a, b) => a.installmentNo - b.installmentNo),
      loansForClient: (clientId) => data.loans.filter((l) => l.clientId === clientId),
    }),
    [data, loading, usingSupabase, syncError, addClient, updateClient, addLoan, setLoanStatus, recordPayment, recordLoanPayment, addProduct, updateProduct, resetData]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <p className="text-sm font-medium text-slate-500">
          {usingSupabase ? 'Connecting to Supabase…' : 'Loading…'}
        </p>
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export { loanSummary };
