-- ============================================================
-- Deliverables — milestones të parashikuar për çdo projekt
-- Çdo faturë lidhet me një deliverable (ose s'ka, nëse opsional).
-- ============================================================

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null, -- p.sh. "D1.1"
  name text not null,
  description text,
  planned_date date,
  actual_date date,
  planned_value_no_vat numeric(18, 2) default 0,
  status text not null default 'Planned'
    check (status in ('Planned', 'In Progress', 'Submitted', 'Accepted', 'Rejected', 'Cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (project_id, code)
);
create index on public.deliverables(org_id);
create index on public.deliverables(project_id);
create index on public.deliverables(deleted_at);

alter table public.deliverables enable row level security;

create policy "org members read deliverables" on public.deliverables
  for select using (org_id in (select public.user_orgs()));

create policy "org members write deliverables" on public.deliverables
  for all using (org_id in (select public.user_orgs()))
  with check (org_id in (select public.user_orgs()));

create trigger set_updated_at before update on public.deliverables
  for each row execute function public.set_updated_at();

drop trigger if exists audit_deliverables on public.deliverables;
create trigger audit_deliverables
  after insert or update or delete on public.deliverables
  for each row execute function public.log_audit();

-- ============================================================
-- Lidh invoices me deliverables (FK në vend të tekstit)
-- ============================================================

alter table public.invoices
  add column if not exists deliverable_id uuid references public.deliverables(id) on delete set null;

create index if not exists invoices_deliverable_id_idx on public.invoices(deliverable_id);

-- Hiqet kolona e vjetër me tekst të lirë.
alter table public.invoices drop column if exists deliverable_number;
