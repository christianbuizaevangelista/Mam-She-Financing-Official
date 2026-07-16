import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, CreditCard, Briefcase, Landmark, Plus, Pencil, Paperclip, Camera } from 'lucide-react';
import { useData } from '../store/DataContext';
import type { Client, Attachment } from '../types';
import { peso, initials, creditRating, fmtDate } from '../lib/format';
import { loanSummary } from '../lib/loan';
import { fileToResizedDataUrl } from '../lib/image';
import { BUSINESS_TYPES } from '../lib/constants';
import { Avatar, Badge, StatusBadge, ProgressBar, EmptyState, Modal, AttachmentsField } from '../components/ui';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const client = id ? data.clientById(id) : undefined;
  const [editing, setEditing] = useState(false);

  if (!client) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-500">Client not found.</p>
        <Link to="/clients" className="btn-secondary mt-4 inline-flex">Back to clients</Link>
      </div>
    );
  }

  const loans = data.loansForClient(client.id);
  const openLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const outstanding = openLoans.reduce((s, l) => s + loanSummary(l, data.repayments).outstanding, 0);
  const totalBorrowed = loans.reduce((s, l) => s + l.principal, 0);
  const rating = creditRating(client.creditScore);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !client) return;
    try {
      const url = await fileToResizedDataUrl(file);
      data.updateClient(client.id, { photoUrl: url });
    } catch {
      /* ignore bad image */
    }
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <div className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <label className="group relative cursor-pointer" title="Change photo">
              <Avatar initials={initials(client.firstName, client.lastName)} photoUrl={client.photoUrl} size="lg" />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white transition-colors group-hover:bg-brand-700">
                <Camera className="h-3.5 w-3.5" />
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            <h2 className="mt-3 text-xl font-bold text-slate-800">{client.firstName} {client.lastName}</h2>
            <p className="text-sm text-slate-500">{client.businessType}</p>
            {client.photoUrl && (
              <button className="mt-1 text-xs font-medium text-slate-400 hover:text-red-600" onClick={() => data.updateClient(client.id, { photoUrl: undefined })}>
                Remove photo
              </button>
            )}
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={client.status} />
              <Badge tone={rating.tone as any}>{rating.label} • {client.creditScore}</Badge>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
            <Info icon={Phone} label="Phone" value={client.phone} />
            {client.email && <Info icon={Mail} label="Email" value={client.email} />}
            <Info icon={MapPin} label="Address" value={`${client.address}, ${client.city}`} />
            <Info icon={Briefcase} label="Business" value={client.businessType} />
            <Info icon={CreditCard} label={client.idType} value={client.idNumber} />
            <Info icon={Landmark} label="Client since" value={fmtDate(client.createdAt)} />
          </div>

          {client.attachments && client.attachments.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="mb-2 text-xs font-medium text-slate-400">Attachments</p>
              <div className="space-y-1.5">
                {client.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn-secondary mt-5 w-full" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit details
          </button>
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <MiniStat label="Outstanding" value={peso(outstanding)} />
            <MiniStat label="Total Borrowed" value={peso(totalBorrowed)} />
            <MiniStat label="Loans" value={String(loans.length)} />
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-bold text-slate-800">Loan History</h3>
              <Link to="/loans" state={{ clientId: client.id }} className="btn-secondary !py-1.5 text-sm">
                <Plus className="h-3.5 w-3.5" /> New Loan
              </Link>
            </div>
            {loans.length === 0 ? (
              <EmptyState icon={Landmark} title="No loans yet" hint="This client has no loan records." />
            ) : (
              <div className="divide-y divide-slate-100">
                {loans.map((loan) => {
                  const sum = loanSummary(loan, data.repayments);
                  const product = data.productById(loan.productId);
                  return (
                    <Link key={loan.id} to={`/loans/${loan.id}`} className="block px-5 py-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{peso(loan.principal)} <span className="font-normal text-slate-400">• {product?.name ?? 'Custom loan'}</span></p>
                          <p className="text-xs text-slate-500">{loan.purpose} • {fmtDate(loan.disbursementDate ?? loan.applicationDate)}</p>
                        </div>
                        <StatusBadge status={loan.status} />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <ProgressBar value={sum.progress} tone={loan.status === 'overdue' ? 'red' : 'brand'} />
                        <span className="whitespace-nowrap text-xs font-medium text-slate-500">{Math.round(sum.progress * 100)}% paid</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {client.notes && (
            <div className="card p-5">
              <h3 className="mb-2 font-bold text-slate-800">Notes</h3>
              <p className="text-sm text-slate-600">{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      <EditClientModal open={editing} onClose={() => setEditing(false)} client={client} />
    </div>
  );
}

function EditClientModal({ open, onClose, client }: { open: boolean; onClose: () => void; client: Client }) {
  const { updateClient } = useData();
  const [form, setForm] = useState<Client>(client);

  // Reload the form from the client whenever it (re)opens.
  useEffect(() => {
    if (open) setForm(client);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client.id]);

  function set<K extends keyof Client>(key: K, value: Client[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone) return;
    const { id, createdAt, ...patch } = form;
    updateClient(client.id, patch);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Client Details" wide>
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
          <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
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
            {form.businessType && !BUSINESS_TYPES.includes(form.businessType) && (
              <option value={form.businessType}>{form.businessType}</option>
            )}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as Client['status'])}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
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
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <AttachmentsField
            attachments={form.attachments ?? []}
            onChange={(next: Attachment[]) => set('attachments', next)}
          />
        </div>
        <div className="sm:col-span-2 mt-1 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-slate-100 p-2 text-slate-500"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
