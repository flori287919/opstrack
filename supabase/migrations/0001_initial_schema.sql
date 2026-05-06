-- ============================================================
-- Operations Management Application — Initial schema
-- Multi-tenant via organizations + Row Level Security
-- ============================================================

-- ----------------------------------------
-- Organizations & members
-- ----------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'director' check (role in ('director')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index on public.org_members(user_id);

-- Helper: returns the org_ids that the current user belongs to
create or replace function public.user_orgs() returns setof uuid
language sql stable security definer set search_path = public
as $$
  select org_id from public.org_members where user_id = auth.uid()
$$;

-- ----------------------------------------
-- Lookup tables (per org)
-- ----------------------------------------
create table public.business_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (org_id, code)
);
create index on public.business_lines(org_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  country text,
  contact_person text,
  email text,
  phone text,
  payment_terms_days int default 0,
  default_modality text check (default_modality in ('Contract', 'PO')),
  beneficiary_same_as_client boolean default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.clients(org_id);

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.beneficiaries(org_id);

create table public.project_managers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  role text check (role in ('Senior PM', 'PM', 'Junior PM', 'Other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.project_managers(org_id);

-- ----------------------------------------
-- Projects (core)
-- ----------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_code text not null, -- p.sh. "1-IN-21"
  bl_id uuid references public.business_lines(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  beneficiary_id uuid references public.beneficiaries(id) on delete set null,
  project_manager_id uuid references public.project_managers(id) on delete set null,
  name text not null,
  contract_start_date date,
  contract_end_date date,
  project_start_date date,
  planned_end_date date,
  modality text check (modality in ('Contract', 'PO')),
  project_approval_form text check (project_approval_form in ('Yes', 'No', 'Pending')),
  project_charter text check (project_charter in ('Yes', 'No', 'Pending')),
  approved_cost_sheets text check (approved_cost_sheets in ('Yes', 'No', 'Pending')),
  project_value_no_vat numeric(18, 2) default 0,
  vat_rate numeric(5, 4) default 0.15, -- 15% default per Albanian VAT
  submission_profit_margin numeric(7, 4) default 0,
  q1_cr_margin numeric(7, 4) default 0,
  q2_cr_margin numeric(7, 4) default 0,
  q3_cr_margin numeric(7, 4) default 0,
  q4_cr_margin numeric(7, 4) default 0,
  client_payment_terms_days int default 0,
  payment_terms_condition text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (org_id, project_code)
);
create index on public.projects(org_id);
create index on public.projects(client_id);
create index on public.projects(deleted_at);

-- ----------------------------------------
-- Invoices to clients
-- ----------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  invoice_number text,
  deliverable_number text,
  planned_issue_date date,
  actual_issue_date date,
  planned_collection_date date,
  expected_collection_date date,
  collection_date date,
  amount_no_vat numeric(18, 2) default 0,
  vat_rate numeric(5, 4) default 0.15,
  status text check (status in ('Scheduled', 'Invoiced', 'Paid', 'Cancelled')) default 'Scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.invoices(org_id);
create index on public.invoices(project_id);
create index on public.invoices(planned_collection_date);
create index on public.invoices(status);

-- ----------------------------------------
-- Non-People cost contracts (subko/furnitorë)
-- ----------------------------------------
create table public.cost_contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  beneficiary_name text,
  contract_name text,
  modality text check (modality in ('Contract', 'PO')),
  status text check (status in ('Active', 'Closed', 'Pending')) default 'Active',
  contract_value_no_taxes numeric(18, 2) default 0,
  tax_label text,
  wht_applicable boolean default false,
  wht_value numeric(18, 2) default 0,
  contract_value_with_taxes numeric(18, 2) default 0,
  subco_payment_terms_days int default 0,
  subco_payment_terms_condition text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.cost_contracts(org_id);
create index on public.cost_contracts(project_id);

-- ----------------------------------------
-- Cost payments (drejt subko)
-- ----------------------------------------
create table public.cost_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  cost_contract_id uuid not null references public.cost_contracts(id) on delete cascade,
  receipt_number text,
  payment_schedule_pct numeric(7, 4),
  invoice_expected_date date,
  due_payment_date date,
  actual_payment_date date,
  amount numeric(18, 2) default 0,
  cost_no_taxes numeric(18, 2) default 0,
  wht numeric(18, 2) default 0,
  status text check (status in ('Scheduled', 'Submitted', 'Paid', 'Cancelled')) default 'Scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.cost_payments(org_id);
create index on public.cost_payments(cost_contract_id);
create index on public.cost_payments(due_payment_date);

-- ----------------------------------------
-- Audit log (kush ndryshoi çfarë, kur)
-- ----------------------------------------
create table public.audit_log (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  row_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log(org_id, created_at desc);
create index on public.audit_log(table_name, row_id);

-- ============================================================
-- Row Level Security policies
-- ============================================================
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.business_lines enable row level security;
alter table public.clients enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.project_managers enable row level security;
alter table public.projects enable row level security;
alter table public.invoices enable row level security;
alter table public.cost_contracts enable row level security;
alter table public.cost_payments enable row level security;
alter table public.audit_log enable row level security;

-- Organizations: members can read; nobody updates directly (handled via RPC)
create policy "members read org" on public.organizations
  for select using (id in (select public.user_orgs()));

create policy "members update own org" on public.organizations
  for update using (id in (select public.user_orgs()));

-- Org members: see your own memberships only
create policy "see own memberships" on public.org_members
  for select using (user_id = auth.uid() or org_id in (select public.user_orgs()));

create policy "insert own membership" on public.org_members
  for insert with check (user_id = auth.uid());

-- Generic per-org policies
do $$
declare t text;
begin
  for t in select unnest(array[
    'business_lines','clients','beneficiaries','project_managers',
    'projects','invoices','cost_contracts','cost_payments'
  ])
  loop
    execute format($f$
      create policy "org members read %1$I" on public.%1$I
        for select using (org_id in (select public.user_orgs()))
    $f$, t);
    execute format($f$
      create policy "org members write %1$I" on public.%1$I
        for all using (org_id in (select public.user_orgs()))
        with check (org_id in (select public.user_orgs()))
    $f$, t);
  end loop;
end $$;

-- Audit log: read-only for org members
create policy "org members read audit" on public.audit_log
  for select using (org_id in (select public.user_orgs()));

-- ============================================================
-- Auto-update timestamps trigger
-- ============================================================
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'organizations','business_lines','clients','beneficiaries','project_managers',
    'projects','invoices','cost_contracts','cost_payments'
  ])
  loop
    execute format('create trigger set_updated_at before update on public.%1$I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ============================================================
-- Sign-up bootstrap: create an org and membership for new users
-- ============================================================
create or replace function public.create_org_for_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare new_org_id uuid;
begin
  insert into public.organizations(name, slug)
    values (
      coalesce(new.raw_user_meta_data->>'org_name', 'My Organization'),
      coalesce(new.raw_user_meta_data->>'org_slug',
               lower(regexp_replace(coalesce(new.raw_user_meta_data->>'org_name','org'),'[^a-z0-9]+','-','gi'))) || '-' || substr(new.id::text, 1, 8)
    )
    returning id into new_org_id;
  insert into public.org_members(org_id, user_id, role) values (new_org_id, new.id, 'director');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_org_for_new_user();
