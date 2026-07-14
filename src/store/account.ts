import { useSyncExternalStore } from 'react';

/** App account/profile shown in the topbar and editable in Settings. */
export interface Account {
  name: string;
  role: string;
  phone: string;
  email: string;
  emailVerified: boolean;
}

const KEY = 'mamshe.account.v1';

const DEFAULT: Account = {
  name: 'StockUp Admin',
  role: 'Owner',
  phone: '0917 000 0000',
  email: 'owner@stockupph.ph',
  emailVerified: true,
};

function load(): Account {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<Account>) };
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

let current: Account = load();
const listeners = new Set<() => void>();

export function getAccount(): Account {
  return current;
}

export function setAccount(patch: Partial<Account>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Reactive hook — components re-render whenever the account changes. */
export function useAccount(): Account {
  return useSyncExternalStore(subscribe, getAccount, getAccount);
}
