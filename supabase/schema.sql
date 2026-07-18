-- Mam-She Financing — database schema
-- Run in Supabase (SQL editor or Management API). Idempotent-ish for first setup.

create table if not exists branches (
  id text primary key,
  name text not null,
  address text
);

create table if not exists clients (
  id text primary key,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  address text,
  city text,
  business_type text,
  id_type text,
  id_number text,
  status text not null default 'active',
  credit_score int not null default 650,
  branch text,
  created_at timestamptz not null default now(),
  notes text,
  attachments jsonb,                              -- [{ name, size }] supporting docs
  photo_url text                                  -- profile photo (resized data URL)
);

create table if not exists loan_products (
  id text primary key,
  name text not null,
  monthly_rate numeric not null,
  term_months int not null,
  min_amount numeric not null,
  max_amount numeric not null,
  frequency text not null,
  active boolean not null default true
);

create table if not exists loans (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  product_id text references loan_products(id),   -- nullable: manual loans have no product
  principal numeric not null,
  monthly_rate numeric not null,                  -- product loans: per month; manual loans: per term
  term_months int not null,
  num_terms int,                                  -- explicit installment count (manual loans)
  interval_days int,                              -- day spacing when frequency = 'daily'
  frequency text not null,
  status text not null default 'pending',
  purpose text,
  application_date timestamptz not null default now(),
  disbursement_date timestamptz,
  officer text,                                   -- legacy loan officer
  guarantor text,
  attachments jsonb                               -- [{ name, size }] supporting docs
);

create table if not exists repayments (
  id text primary key,
  loan_id text references loans(id) on delete cascade,
  installment_no int not null,
  due_date timestamptz not null,
  amount_due numeric not null,
  amount_paid numeric not null default 0,
  paid_date timestamptz,
  status text not null default 'pending'
);

create index if not exists idx_loans_client on loans(client_id);
create index if not exists idx_repayments_loan on repayments(loan_id);

-- Row Level Security — authenticated users only.
-- The public 'anon' role gets NO access; a valid Supabase Auth session
-- (role = authenticated) is required to read or write any table.
alter table branches enable row level security;
alter table clients enable row level security;
alter table loan_products enable row level security;
alter table loans enable row level security;
alter table repayments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['branches','clients','loan_products','loans','repayments']
  loop
    execute format('drop policy if exists "demo_all" on %I;', t);
    execute format('drop policy if exists "auth_all" on %I;', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
