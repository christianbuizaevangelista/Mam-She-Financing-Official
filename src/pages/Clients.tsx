import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, Users, Phone, MapPin } from 'lucide-react';
import { useData } from '../store/DataContext';
import type { Client, ClientStatus } from '../types';
import { peso, initials, creditRating, fmtDate } from '../lib/format';
import { loanSummary } from '../lib/loan';
import { BUSINESS_TYPES } from '../lib/constants';
import { Avatar, Badge, StatusBadge, PageHeader, Modal, EmptyState, AttachmentsField } from '../components/ui';

const BRANCH_NAMES: Record<string, string> = {
  'br-1': 'Quezon City',
  'br-2': 'Caloocan',
  'br-3': 'Pasig',
};

export default function Clients() {
  const data = useData();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | ClientStatus>('all');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    return data.clients.filter((c) => {
      const matchesQ =
        q === '' ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
        c.phone.includes(q) ||
        c.businessType.toLowerCase().includes(q.toLowerCase());
      const matchesStatus = status === 'all' || c.status === status;
      return matchesQ && matchesStatus;
    });
  }, [data.clients, q, status]);

  return (
    <div>
      <PageHeader
        title="CRM — Clients"
        subtitle={`${data.clients.length} borrowers on file`}
        action={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <UserPlus className="h-4 w-4" /> Add Client
          </button>
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Search by name, phone, business…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-lg bg-white p-1 shadow-card">
          {(['all', 'active', 'inactive', 'blacklisted'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                status === s ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of client cards */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title="No clients found" hint="Try a different search or add a new client." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const loans = data.loansForClient(c.id);
            const openLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
            const outstanding = openLoans.reduce((s, l) => s + loanSummary(l, data.repayments).outstanding, 0);
            const rating = creditRating(c.creditScore);
            return (
              <Link key={c.id} to={`/clients/${c.id}`} className="card p-5 transition-shadow hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <Avatar initials={initials(c.firstName, c.lastName)} photoUrl={c.photoUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold text-slate-800">{c.firstName} {c.lastName}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="truncate text-sm text-slate-500">{c.businessType}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Loans</p>
                    <p className="font-bold text-slate-700">{loans.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Outstanding</p>
                    <p className="font-bold text-slate-700">{peso(outstanding)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Credit</p>
                    <p className="font-bold text-slate-700">{c.creditScore}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge tone={rating.tone as any}>{rating.label}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="h-3 w-3" /> {BRANCH_NAMES[c.branch] ?? c.city} • since {fmtDate(c.createdAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <AddClientModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function AddClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addClient } = useData();
  const empty: Omit<Client, 'id' | 'createdAt'> = {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Quezon City',
    businessType: '',
    idType: 'PhilID',
    idNumber: '',
    status: 'active',
    creditScore: 650,
    branch: 'br-1',
    notes: '',
    attachments: [],
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone) return;
    addClient(form);
    setForm(empty);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Client" wide>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name *</label>
          <input className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
        </div>
        <div>
          <label className="label">Last name *</label>
          <input className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
        </div>
        <div>
          <label className="label">Phone *</label>
          <input className="input" placeholder="0917 xxx xxxx" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div>
          <label className="label">Business type</label>
          <select className="input" value={form.businessType} onChange={(e) => set('businessType', e.target.value)}>
            <option value="">Select business type…</option>
            {BUSINESS_TYPES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Branch</label>
          <select className="input" value={form.branch} onChange={(e) => set('branch', e.target.value)}>
            <option value="br-1">Main — Quezon City</option>
            <option value="br-2">Caloocan</option>
            <option value="br-3">Pasig</option>
          </select>
        </div>
        <div>
          <label className="label">Credit score</label>
          <input className="input" type="number" min={300} max={850} value={form.creditScore} onChange={(e) => set('creditScore', Number(e.target.value))} />
        </div>
        <div>
          <label className="label">ID type</label>
          <select className="input" value={form.idType} onChange={(e) => set('idType', e.target.value)}>
            <option>PhilID</option>
            <option>Driver's License</option>
            <option>SSS</option>
            <option>UMID</option>
            <option>Passport</option>
          </select>
        </div>
        <div>
          <label className="label">ID number</label>
          <input className="input" value={form.idNumber} onChange={(e) => set('idNumber', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <AttachmentsField attachments={form.attachments ?? []} onChange={(next) => set('attachments', next)} />
        </div>
        <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save Client</button>
        </div>
      </form>
    </Modal>
  );
}
