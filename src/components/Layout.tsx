import { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useData } from '../store/DataContext';
import { useAccount } from '../store/account';
import { useAuth } from '../store/auth';
import { Logo } from './Logo';
import { initialsFromName } from '../lib/format';
import {
  LayoutDashboard,
  Users,
  Landmark,
  Wallet,
  BarChart3,
  Settings,
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'CRM — Clients', icon: Users },
  { to: '/loans', label: 'Loans', icon: Landmark },
  { to: '/collections', label: 'Collections', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { usingSupabase } = useData();
  const account = useAccount();
  const { signOut } = useAuth();

  async function logout() {
    setMenuOpen(false);
    if (!confirm('Log out of StockUp PH?')) return;
    await signOut(); // AuthProvider swaps to the login screen on sign-out
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-ink text-slate-300 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo className="h-9 w-9" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">StockUp</p>
            <p className="text-[11px] font-semibold text-gold-400">PH</p>
          </div>
        </div>
        <nav className="mt-2 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-ink-800 hover:text-white'
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-3 bottom-4 rounded-lg bg-ink-800 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <span className={clsx('h-2 w-2 rounded-full', usingSupabase ? 'bg-emerald-400' : 'bg-amber-400')} />
            {usingSupabase ? 'Supabase connected' : 'Local storage'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {usingSupabase ? 'Data synced to your cloud database.' : 'Saved in your browser. Reset anytime in Settings.'}
          </p>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="btn-ghost !px-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input !pl-9" placeholder="Search clients, loans…" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-ghost relative !px-2" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {initialsFromName(account.name)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold leading-none text-slate-800">{account.name}</p>
                  <p className="text-[11px] text-slate-400">{account.role}</p>
                </div>
                <ChevronDown className={clsx('hidden h-4 w-4 text-slate-400 transition-transform sm:block', menuOpen && 'rotate-180')} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="card absolute right-0 z-50 mt-2 w-60 p-1.5">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-slate-800">{account.name}</p>
                      <p className="truncate text-xs text-slate-400">{account.email}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                    >
                      <SettingsIcon className="h-4 w-4 text-slate-400" /> Account settings
                    </Link>
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main key={location.pathname} className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
