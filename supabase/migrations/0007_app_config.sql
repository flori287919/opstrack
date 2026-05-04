-- ============================================================
-- App-wide config (super-admin emails, etc.)
-- One-row-per-key store; values read by SECURITY DEFINER
-- functions only. RLS enabled with NO policies → only the
-- service role can SELECT/UPDATE directly, which is what we
-- want: routine code goes through the helper functions.
-- ============================================================

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
-- intentionally no policies

insert into public.app_config(key, value)
  values ('super_admin_emails', 'florjan.salaj@gmail.com')
  on conflict (key) do nothing;

-- ============================================================
-- is_super_admin() — used by the approval/listing functions.
-- Returns true if the calling user's email matches one of the
-- comma-separated emails stored in app_config.
-- ============================================================
create or replace function public.is_super_admin()
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_email text;
  v_emails_csv text;
begin
  select u.email into v_email from auth.users u where u.id = auth.uid();
  if v_email is null then return false; end if;
  select c.value into v_emails_csv from public.app_config c where c.key = 'super_admin_emails';
  if v_emails_csv is null or v_emails_csv = '' then return false; end if;
  return exists(
    select 1 from unnest(string_to_array(v_emails_csv, ',')) as e
    where lower(trim(e)) = lower(v_email)
  );
end $$;

revoke execute on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- ============================================================
-- Update the 3 admin functions to consult is_super_admin()
-- instead of hard-coding the email.
-- ============================================================
create or replace function public.list_pending_signups()
returns table(org_id uuid, user_id uuid, email text, org_name text, created_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then return; end if;
  return query
    select m.org_id, m.user_id, u.email::text, o.name as org_name, m.created_at
    from public.org_members m
    join auth.users u on u.id = m.user_id
    join public.organizations o on o.id = m.org_id
    where m.approved = false
    order by m.created_at desc;
end $$;

create or replace function public.approve_signup(p_org_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then raise exception 'Forbidden'; end if;
  update public.org_members
    set approved = true
    where org_id = p_org_id and user_id = p_user_id;
end $$;

create or replace function public.reject_signup(p_org_id uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then raise exception 'Forbidden'; end if;
  delete from public.organizations where id = p_org_id;
end $$;
