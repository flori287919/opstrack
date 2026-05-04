-- ============================================================
-- People Costs — stafi, alokimet në projekte, timesheets
-- ============================================================

-- People (stafi)
create table public.people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  role text,
  email text,
  employment_type text not null default 'Salaried'
    check (employment_type in ('Salaried', 'Daily', 'Hourly')),
  monthly_salary numeric(18, 2),
  daily_rate numeric(18, 2),
  hourly_rate numeric(18, 2),
  default_billable_daily_rate numeric(18, 2),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.people(org_id);
create index on public.people(deleted_at);

-- Allocations: person ↔ project
create table public.people_allocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  allocation_pct numeric(5, 4) not null default 1.0 check (allocation_pct >= 0),
  start_date date not null,
  end_date date,
  billable_daily_rate numeric(18, 2), -- override mbi default të personit
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.people_allocations(org_id);
create index on public.people_allocations(person_id);
create index on public.people_allocations(project_id);
create index on public.people_allocations(deleted_at);

-- Timesheets (orët e punës; përdoret kryesisht për Hourly por lejohet për të gjithë)
create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  hours numeric(6, 2) not null check (hours > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.timesheets(org_id);
create index on public.timesheets(person_id);
create index on public.timesheets(project_id);
create index on public.timesheets(date);
create index on public.timesheets(deleted_at);

-- ============================================================
-- RLS
-- ============================================================
alter table public.people enable row level security;
alter table public.people_allocations enable row level security;
alter table public.timesheets enable row level security;

create policy "org members read people" on public.people
  for select using (org_id in (select public.user_orgs()));
create policy "org members write people" on public.people
  for all using (org_id in (select public.user_orgs()))
  with check (org_id in (select public.user_orgs()));

create policy "org members read allocations" on public.people_allocations
  for select using (org_id in (select public.user_orgs()));
create policy "org members write allocations" on public.people_allocations
  for all using (org_id in (select public.user_orgs()))
  with check (org_id in (select public.user_orgs()));

create policy "org members read timesheets" on public.timesheets
  for select using (org_id in (select public.user_orgs()));
create policy "org members write timesheets" on public.timesheets
  for all using (org_id in (select public.user_orgs()))
  with check (org_id in (select public.user_orgs()));

-- ============================================================
-- updated_at + audit
-- ============================================================
create trigger set_updated_at before update on public.people
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.people_allocations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.timesheets
  for each row execute function public.set_updated_at();

drop trigger if exists audit_people on public.people;
create trigger audit_people
  after insert or update or delete on public.people
  for each row execute function public.log_audit();

drop trigger if exists audit_people_allocations on public.people_allocations;
create trigger audit_people_allocations
  after insert or update or delete on public.people_allocations
  for each row execute function public.log_audit();

drop trigger if exists audit_timesheets on public.timesheets;
create trigger audit_timesheets
  after insert or update or delete on public.timesheets
  for each row execute function public.log_audit();
