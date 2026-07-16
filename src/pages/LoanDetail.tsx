import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Banknote, User, Paperclip } from 'lucide-react';
import { useData } from '../store/DataContext';
import { peso, pct, fmtDate, initials } from '../lib/format';
import { loanSummary, installmentAmount, loanGuarantors } from '../lib/loan';
import { Avatar, StatusBadge, ProgressBar, Modal } from '../components/ui';
import type { Repayment } from '../types';

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const loan = id ? data.loanById(id) : undefined;
  const [payTarget, setPayTarget] = useState<Repayment | null>(null);
  const [payLoanOpen, setPayLoanOpen] = useState(false);

  if (!loan) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-500">Loan not found.</p>
        <Link to="/loans" className="btn-secondary mt-4 inline-flex">Back to loans</Link>
      </div>
    );
  }

  const client = data.clientById(loan.clientId);
  const product = data.productById(loan.productId);
  const sum = loanSummary(loan, data.repayments);
  const schedule = data.repaymentsForLoan(loan.id);
  const guarantors = loanGuarantors(loan);

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="card mb-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{peso(loan.principal)}</h1>
              <StatusBadge status={loan.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{product?.name ?? 'Custom loan'} • {loan.purpose}</p>
            {client && (
              <Link to={`/clients/${client.id}`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm hover:bg-slate-100">
                <Avatar initials={initials(client.firstName, client.lastName)} photoUrl={client.photoUrl} size="sm" />
                <span className="font-medium text-slate-700">{client.firstName} {client.lastName}</span>
                <User className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            )}
          </div>

          {loan.status === 'pending' && (
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => data.setLoanStatus(loan.id, 'active')}>
                <CheckCircle2 className="h-4 w-4" /> Approve & Disburse
              </button>
              <button className="btn-danger" onClick={() => data.setLoanStatus(loan.id, 'rejected')}>
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4 lg:grid-cols-6">
          <Term label="Interest" value={`${pct(loan.monthlyRate)}/mo`} />
          <Term label="Term" value={`${loan.termMonths} month${loan.termMonths === 1 ? '' : 's'}`} />
          <Term label="Frequency" value={freqText(loan)} />
          <Term label="Installment" value={peso(installmentAmount(loan), { decimals: true })} />
          <Term label="Disbursed" value={fmtDate(loan.disbursementDate)} />
          <Term label="Guarantors" value={String(guarantors.length || '—')} />
        </div>

        {guarantors.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="mb-2 text-xs font-medium text-slate-400">
              {guarantors.length > 1 ? 'Guarantors' : 'Guarantor'}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {guarantors.map((g, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-slate-800">{g.name}</p>
                  <p className="text-xs text-slate-500">{g.email || 'no email'} · {g.phone || 'no mobile'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loan.attachments && loan.attachments.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="mb-2 text-xs font-medium text-slate-400">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {loan.attachments.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700">
                  <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary + schedule */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-sm text-slate-500">Repayment progress</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{Math.round(sum.progress * 100)}%</p>
            <div className="mt-3"><ProgressBar value={sum.progress} tone={loan.status === 'overdue' ? 'red' : 'brand'} /></div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Total payable" value={peso(sum.total)} />
              <Row label="Paid to date" value={peso(sum.paid)} tone="text-emerald-600" />
              <Row label="Outstanding" value={peso(sum.outstanding)} bold />
              {sum.overdueAmount > 0 && <Row label="Overdue" value={peso(sum.overdueAmount)} tone="text-red-600" bold />}
            </div>
          </div>
          {sum.nextDue && loan.status !== 'paid' && (
            <div className="card border-brand-200 bg-brand-50/50 p-5">
              <p className="text-sm font-semibold text-brand-800">Next payment due</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{peso(sum.nextDue.amountDue - sum.nextDue.amountPaid, { decimals: true })}</p>
              <p className="text-sm text-slate-500">Installment #{sum.nextDue.installmentNo} • {fmtDate(sum.nextDue.dueDate)}</p>
              <button className="btn-primary mt-3 w-full" onClick={() => setPayLoanOpen(true)}>
                <Banknote className="h-4 w-4" /> Record Payment
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">Outstanding balance: {peso(sum.outstanding, { decimals: true })}</p>
            </div>
          )}
        </div>

        {/* Schedule table */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-bold text-slate-800">Amortization Schedule</h3>
            <p className="text-sm text-slate-500">{schedule.length} installments</p>
          </div>
          {schedule.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No schedule yet — approve the loan to generate one.</div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="th">#</th>
                    <th className="th">Due date</th>
                    <th className="th">Amount</th>
                    <th className="th">Paid</th>
                    <th className="th">Status</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedule.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="td text-slate-400">{r.installmentNo}</td>
                      <td className="td">{fmtDate(r.dueDate)}</td>
                      <td className="td font-medium">{peso(r.amountDue, { decimals: true })}</td>
                      <td className="td text-emerald-600">{r.amountPaid > 0 ? peso(r.amountPaid, { decimals: true }) : '—'}</td>
                      <td className="td"><StatusBadge status={r.status} /></td>
                      <td className="td text-right">
                        {r.status !== 'paid' && loan.status !== 'rejected' && (
                          <button className="btn-secondary !py-1 text-xs" onClick={() => setPayTarget(r)}>Pay</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <PaymentModal repayment={payTarget} onClose={() => setPayTarget(null)} />
      <LoanPaymentModal open={payLoanOpen} onClose={() => setPayLoanOpen(false)} loanId={loan.id} />
    </div>
  );
}

function LoanPaymentModal({ open, onClose, loanId }: { open: boolean; onClose: () => void; loanId: string }) {
  const data = useData();
  const loan = data.loanById(loanId);
  const sum = loan ? loanSummary(loan, data.repayments) : null;
  const outstanding = sum ? sum.outstanding : 0;
  const nextRemaining = sum?.nextDue ? sum.nextDue.amountDue - sum.nextDue.amountPaid : outstanding;
  const [amount, setAmount] = useState(nextRemaining);

  useEffect(() => {
    if (open) setAmount(nextRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;
    data.recordLoanPayment(loanId, Math.min(amount, outstanding));
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          {sum?.nextDue && (
            <div className="flex justify-between">
              <span className="text-slate-500">Next installment</span>
              <span className="font-medium">{peso(nextRemaining, { decimals: true })}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between">
            <span className="text-slate-500">Outstanding balance</span>
            <span className="font-bold">{peso(outstanding, { decimals: true })}</span>
          </div>
        </div>
        <div>
          <label className="label">Amount received</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min={0}
            max={outstanding}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setAmount(Number(outstanding.toFixed(2)))}
            className="mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Pay full outstanding balance ({peso(outstanding, { decimals: true })})
          </button>
          <p className="mt-1 text-xs text-slate-400">Payments apply to the oldest unpaid installments first.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary"><Banknote className="h-4 w-4" /> Confirm Payment</button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ repayment, onClose }: { repayment: Repayment | null; onClose: () => void }) {
  const { recordPayment } = useData();
  const remaining = repayment ? repayment.amountDue - repayment.amountPaid : 0;
  const [amount, setAmount] = useState(remaining);

  // Sync amount whenever a new repayment target opens.
  useEffect(() => {
    if (repayment) setAmount(repayment.amountDue - repayment.amountPaid);
  }, [repayment]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!repayment || amount <= 0) return;
    recordPayment(repayment.id, amount);
    onClose();
  }

  return (
    <Modal open={Boolean(repayment)} onClose={onClose} title="Record Payment">
      {repayment && (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Installment</span><span className="font-medium">#{repayment.installmentNo}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Due date</span><span className="font-medium">{fmtDate(repayment.dueDate)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Remaining</span><span className="font-bold">{peso(remaining, { decimals: true })}</span></div>
          </div>
          <div>
            <label className="label">Amount received</label>
            <input className="input" type="number" step="0.01" max={remaining} value={amount} onChange={(e) => setAmount(Number(e.target.value))} autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary"><Banknote className="h-4 w-4" /> Confirm Payment</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function freqText(loan: { frequency: string; intervalDays?: number }): string {
  if (loan.frequency === 'daily') {
    const d = loan.intervalDays ?? 1;
    return `Every ${d} day${d === 1 ? '' : 's'}`;
  }
  if (loan.frequency === 'bimonthly') return 'Bi-monthly';
  if (loan.frequency === 'biweekly') return 'Bi-weekly';
  return loan.frequency.charAt(0).toUpperCase() + loan.frequency.slice(1);
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold capitalize text-slate-700">{value}</p>
    </div>
  );
}

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`${tone ?? 'text-slate-700'} ${bold ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}
