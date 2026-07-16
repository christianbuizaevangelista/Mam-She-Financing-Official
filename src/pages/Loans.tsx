import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search, Landmark } from 'lucide-react';
import { useData } from '../store/DataContext';
import type { Loan, LoanStatus, PaymentFrequency, LoanAttachment, Guarantor } from '../types';
import { peso, initials, fmtDate } from '../lib/format';
import { loanSummary, monthsToInstallments, loanGuarantors } from '../lib/loan';
import { computeRange, inRange, type DateRange } from '../lib/dateRange';
import { TASTY_FOOD_RESELLER, TASTY_FOOD_RESELLER_RATE } from '../lib/constants';

/** Default monthly interest for a new loan. */
const DEFAULT_RATE = 3;
import { Avatar, StatusBadge, ProgressBar, PageHeader, Modal, EmptyState, AttachmentsField, DateRangeFilter } from '../components/ui';

const FILTERS: ('all' | LoanStatus)[] = ['all', 'active', 'overdue', 'pending', 'paid', 'defaulted'];

const FREQ_LABEL: Record<PaymentFrequency, string> = {
  daily: 'daily',
  weekly: 'weekly',
  biweekly: 'bi-weekly',
  bimonthly: 'bi-monthly',
  monthly: 'monthly',
};


export default function Loans() {
  const data = useData();
  const location = useLocation();
  const preselectClient = (location.state as { clientId?: string } | null)?.clientId;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | LoanStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showNew, setShowNew] = useState(Boolean(preselectClient));

  const rows = useMemo(() => {
    const range = computeRange(dateRange, customFrom, customTo);
    return data.loans
      .filter((l) => filter === 'all' || l.status === filter)
      .filter((l) => inRange(l.applicationDate, range))
      .filter((l) => {
        if (!q) return true;
        const c = data.clientById(l.clientId);
        const name = c ? `${c.firstName} ${c.lastName}` : '';
        return name.toLowerCase().includes(q.toLowerCase()) || l.purpose.toLowerCase().includes(q.toLowerCase());
      })
      .sort((a, b) => b.applicationDate.localeCompare(a.applicationDate));
  }, [data, q, filter, dateRange, customFrom, customTo]);

  return (
    <div>
      <PageHeader
        title="Loans"
        subtitle={dateRange === 'all' && filter === 'all' && !q
          ? `${data.loans.length} loans in the system`
          : `${rows.length} of ${data.loans.length} loans shown`}
        action={
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> New Loan
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Search by client or purpose…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <DateRangeFilter
          range={dateRange}
          onRangeChange={setDateRange}
          from={customFrom}
          to={customTo}
          onFromChange={setCustomFrom}
          onToChange={setCustomTo}
        />
        <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 shadow-card">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === s ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>


      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Landmark} title="No loans found" hint="Adjust filters or create a new loan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Client</th>
                  <th className="th">Type</th>
                  <th className="th">Principal</th>
                  <th className="th">Outstanding</th>
                  <th className="th">Progress</th>
                  <th className="th">Guarantor</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((loan) => {
                  const c = data.clientById(loan.clientId);
                  const product = data.productById(loan.productId);
                  const sum = loanSummary(loan, data.repayments);
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50">
                      <td className="td">
                        <Link to={`/loans/${loan.id}`} className="flex items-center gap-2.5">
                          <Avatar initials={c ? initials(c.firstName, c.lastName) : '??'} photoUrl={c?.photoUrl} size="sm" />
                          <div>
                            <p className="font-medium text-slate-700">{c?.firstName} {c?.lastName}</p>
                            <p className="text-xs text-slate-400">{fmtDate(loan.applicationDate)}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="td text-slate-500">{product?.name ?? 'Custom'}</td>
                      <td className="td font-semibold">{peso(loan.principal)}</td>
                      <td className="td">{peso(sum.outstanding)}</td>
                      <td className="td w-40">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={sum.progress} tone={loan.status === 'overdue' ? 'red' : 'brand'} />
                          <span className="text-xs text-slate-400">{Math.round(sum.progress * 100)}%</span>
                        </div>
                      </td>
                      <td className="td text-slate-500">
                        {loanGuarantors(loan).map((g) => g.name).join(', ') || '—'}
                      </td>
                      <td className="td"><StatusBadge status={loan.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewLoanModal open={showNew} onClose={() => setShowNew(false)} preselectClient={preselectClient} />
    </div>
  );
}

function NewLoanModal({ open, onClose, preselectClient }: { open: boolean; onClose: () => void; preselectClient?: string }) {
  const data = useData();
  const [clientId, setClientId] = useState(preselectClient ?? '');
  const [principal, setPrincipal] = useState(10000);
  const [interestRate, setInterestRate] = useState(DEFAULT_RATE); // % per month
  const [numMonths, setNumMonths] = useState(6);
  const [frequency, setFrequency] = useState<PaymentFrequency>('monthly');
  const [intervalDays, setIntervalDays] = useState(15);
  const [purpose, setPurpose] = useState('');
  const [guarantors, setGuarantors] = useState<Guarantor[]>([{ name: '', email: '', phone: '' }]);
  const [attachments, setAttachments] = useState<LoanAttachment[]>([]);
  const [disburse, setDisburse] = useState(true);

  useEffect(() => {
    if (preselectClient) setClientId(preselectClient);
  }, [preselectClient]);

  // Tasty Food Reseller clients get a fixed monthly interest rate.
  const selectedClient = data.clientById(clientId);
  const rateLocked = selectedClient?.businessType === TASTY_FOOD_RESELLER;

  useEffect(() => {
    setInterestRate(rateLocked ? TASTY_FOOD_RESELLER_RATE : DEFAULT_RATE);
    // Tasty Food Reseller loans need two guarantors; everyone else needs one.
    const needed = rateLocked ? 2 : 1;
    setGuarantors((prev) => {
      if (prev.length === needed) return prev;
      if (prev.length < needed) {
        return [...prev, ...Array.from({ length: needed - prev.length }, () => ({ name: '', email: '', phone: '' }))];
      }
      return prev.slice(0, needed);
    });
  }, [rateLocked]);

  function setGuarantorField(i: number, key: keyof Guarantor, value: string) {
    setGuarantors((prev) => prev.map((g, idx) => (idx === i ? { ...g, [key]: value } : g)));
  }

  const preview = useMemo(() => {
    const rate = (Number(interestRate) || 0) / 100;
    const months = Math.max(0, Number(numMonths) || 0);
    const n = months > 0 ? monthsToInstallments(months, frequency, Number(intervalDays) || 15) : 0;
    const interest = principal * rate * months; // flat: per-month rate over the term
    const total = principal + interest;
    return { n, interest, total, installment: n > 0 ? total / n : 0 };
  }, [principal, interestRate, numMonths, frequency, intervalDays]);

  const invalid =
    !clientId ||
    !purpose ||
    guarantors.some((g) => !g.name.trim()) ||
    principal <= 0 ||
    Number(interestRate) < 0 ||
    Number(numMonths) < 1 ||
    (frequency === 'daily' && Number(intervalDays) < 1);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    data.addLoan({
      clientId,
      principal,
      interestRate: Number(interestRate),
      numMonths: Number(numMonths),
      frequency,
      intervalDays: frequency === 'daily' ? Number(intervalDays) : undefined,
      purpose,
      guarantors: guarantors.map((g) => ({ name: g.name.trim(), email: g.email?.trim(), phone: g.phone?.trim() })),
      attachments,
      disburse,
    });
    onClose();
    reset();
  }
  function reset() {
    setClientId('');
    setPurpose('');
    setGuarantors([{ name: '', email: '', phone: '' }]);
    setPrincipal(10000);
    setInterestRate(DEFAULT_RATE);
    setNumMonths(6);
    setFrequency('monthly');
    setAttachments([]);
  }

  return (
    <Modal open={open} onClose={onClose} title="New Loan Application" wide>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Client *</label>
          <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select client…</option>
            {data.clients.filter((c) => c.status !== 'blacklisted').map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.businessType}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Principal amount *</label>
          <input className="input" type="number" min={1} value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} required />
        </div>
        <div>
          <label className="label">Interest rate (% per month) *</label>
          <input
            className={`input ${rateLocked ? 'bg-slate-50 text-slate-500' : ''}`}
            type="number"
            step="0.1"
            min={0}
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            readOnly={rateLocked}
            required
          />
          {rateLocked && (
            <p className="mt-1 text-xs font-medium text-brand-600">
              Fixed {TASTY_FOOD_RESELLER_RATE}%/month for {TASTY_FOOD_RESELLER} clients.
            </p>
          )}
        </div>

        <div>
          <label className="label">Number of months *</label>
          <input className="input" type="number" min={1} value={numMonths} onChange={(e) => setNumMonths(Number(e.target.value))} required />
        </div>

        {/* Guarantors — two are required for Tasty Food Reseller clients */}
        <div className="sm:col-span-2 space-y-4 rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">
            {guarantors.length > 1 ? 'Guarantors' : 'Guarantor'}
            {rateLocked && (
              <span className="ml-2 font-normal text-brand-600">2 required for {TASTY_FOOD_RESELLER}</span>
            )}
          </p>
          {guarantors.map((g, i) => (
            <div key={i}>
              {guarantors.length > 1 && <p className="mb-1.5 text-xs font-semibold text-slate-400">Guarantor {i + 1}</p>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Full name *</label>
                  <input className="input" placeholder="Full name" value={g.name} onChange={(e) => setGuarantorField(i, 'name', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="guarantor@email.com" value={g.email ?? ''} onChange={(e) => setGuarantorField(i, 'email', e.target.value)} />
                </div>
                <div>
                  <label className="label">Cellphone number</label>
                  <input className="input" placeholder="0917 xxx xxxx" value={g.phone ?? ''} onChange={(e) => setGuarantorField(i, 'phone', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400">
            Each guarantor gets an email + text if the client is 7+ days past due.
          </p>
        </div>

        <div className={frequency === 'daily' ? '' : 'sm:col-span-2'}>
          <label className="label">Payment frequency *</label>
          <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}>
            <option value="daily">Days</option>
            <option value="bimonthly">Bi-monthly (twice a month)</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        {frequency === 'daily' && (
          <div>
            <label className="label">Every how many days? *</label>
            <input className="input" type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(Number(e.target.value))} required />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="label">Purpose *</label>
          <input className="input" placeholder="e.g. Restock sari-sari store inventory" value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
        </div>

        {/* Attachments — after each upload a fresh upload slot appears */}
        <div className="sm:col-span-2">
          <AttachmentsField attachments={attachments} onChange={setAttachments} />
        </div>

        {/* Amortization preview */}
        <div className="sm:col-span-2 rounded-lg bg-brand-50 p-4">
          <p className="mb-3 text-sm font-semibold text-brand-800">Repayment Preview</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PreviewStat label="Per installment" value={peso(preview.installment, { decimals: true })} highlight />
            <PreviewStat
              label={`# of ${FREQ_LABEL[frequency]} payments`}
              value={String(preview.n)}
            />
            <PreviewStat label="Total interest" value={peso(preview.interest)} />
            <PreviewStat label="Total payable" value={peso(preview.total)} />
          </div>
          {frequency === 'daily' && (
            <p className="mt-2 text-xs text-brand-700/70">Payments due every {intervalDays} day{Number(intervalDays) === 1 ? '' : 's'}.</p>
          )}
        </div>

        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={disburse} onChange={(e) => setDisburse(e.target.checked)} />
          Disburse immediately (creates repayment schedule). Uncheck to save as pending application.
        </label>

        <div className="sm:col-span-2 mt-1 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={invalid}>
            {disburse ? 'Disburse Loan' : 'Save Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PreviewStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-brand-700/70">{label}</p>
      <p className={`font-bold ${highlight ? 'text-lg text-brand-700' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}
