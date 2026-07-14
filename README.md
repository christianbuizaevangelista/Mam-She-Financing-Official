# StockUp PH

A microfinance lending management app for small-business / barangay lending. Built with **React + TypeScript + Vite + Tailwind CSS**, with charts by **Recharts**.

Data is persisted to a **Supabase** (PostgreSQL) backend. On first run the app seeds realistic demo data into your Supabase project, then reads and writes through to it. If Supabase env vars are missing or the connection fails, the app automatically falls back to browser `localStorage` so it always runs.

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Portfolio KPIs (disbursed, outstanding, active borrowers, PAR), disbursements-vs-collections chart, loan-status breakdown, collections focus, recent applications |
| **CRM — Clients** | Borrower directory with search & status filters, credit ratings, add-client form, per-client profile with loan history & KYC |
| **Loans** | Loan list with filters, new-loan application with **live amortization preview**, approve/disburse/reject workflow |
| **Loan detail** | Full amortization schedule, repayment progress, record payments (full or partial) |
| **Collections** | Overdue / due-today / this-week / upcoming buckets with payment aging and one-click collection |
| **Reports** | Portfolio by product, performance by branch, monthly disbursement vs collection, portfolio-at-risk |
| **Settings** | Manage loan products (rate/term/limits/frequency), branches, reset demo data |

## Lending model

Uses **flat monthly interest**, common in Philippine microfinance:

```
total interest = principal × monthlyRate × termMonths
total payable  = principal + total interest
installment    = total payable ÷ number of installments
```

Installment count depends on frequency (weekly ≈ term × 4, biweekly ≈ term × 2, monthly = term). All calculations live in `src/lib/loan.ts`.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key
npm run dev            # http://localhost:5173
npm run build          # production build to dist/
npm run preview        # preview the production build
```

## Supabase backend

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase **SQL Editor** to create the tables (`branches`, `clients`, `loan_products`, `loans`, `repayments`).
3. Copy your **Project URL** and **anon public key** (Project Settings → API) into `.env`:
   ```
   VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Start the app — it seeds the demo data on first run and syncs all changes to Supabase.

The data layer is isolated in `src/store/repo.ts` (Supabase queries) and `src/lib/mappers.ts` (row ↔ domain), so the UI never touches SQL directly.

> **Security:** the demo RLS policies grant the public `anon` role full read/write so the app works without a login. Before going to production, add [Supabase Auth](https://supabase.com/docs/guides/auth) and tighten the policies in `supabase/schema.sql` to authenticated staff only.

## Project structure

```
src/
  components/    Layout (sidebar/topbar) + shared UI (cards, badges, modal…)
  data/seed.ts   Demo clients, products, loans & generated repayment schedules
  lib/           format (₱, dates), loan math, portfolio metrics
  pages/         Dashboard, Clients, ClientDetail, Loans, LoanDetail,
                 Collections, Reports, Settings
  store/         DataContext — state, actions, localStorage persistence
  types.ts       Domain model (Client, Loan, LoanProduct, Repayment…)
```

## Notes

- Currency is Philippine Peso (₱).
- Demo login/branding is illustrative — no real authentication yet.
- To wire a backend, replace the action implementations in `DataContext.tsx` with API calls; the component layer stays the same.
