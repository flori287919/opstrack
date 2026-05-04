-- ============================================================
-- Approval flow for new signups
-- Every new org_members row defaults to approved=false; super-admin
-- approves via /admin page. Existing memberships are backfilled
-- as approved so they keep working.
-- ============================================================

alter table public.org_members
  add column if not exists approved boolean not null default false;

-- Backfill: anyone already in the system stays approved.
update public.org_members set approved = true where approved is distinct from true;

-- Modify the auto-org trigger so new signups are NOT auto-approved.
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
  insert into public.org_members(org_id, user_id, role, approved)
    values (new_org_id, new.id, 'director', false);
  return new;
end $$;

-- Lock down execution again (kept SECURITY INVOKER would fail because it inserts on tables the user can't reach)
revoke execute on function public.create_org_for_new_user() from public, anon, authenticated;

create index if not exists org_members_approved_idx on public.org_members(approved);

-- ============================================================
-- list_pending_signups() — used by the /admin page.
-- SECURITY DEFINER so it can read auth.users (emails). Returns
-- empty unless the caller's email matches the hard-coded
-- super-admin. Move to a config table later.
-- ============================================================
create or replace function public.list_pending_signups()
returns table(org_id uuid, user_id uuid, email text, org_name text, created_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_caller_email text;
begin
  select u.email into v_caller_email from auth.users u where u.id = auth.uid();
  if v_caller_email is null or lower(v_caller_email) <> 'florjan.salaj@gmail.com' then
    return;
  end if;
  return query
    select m.org_id, m.user_id, u.email::text, o.name as org_name, m.created_at
    from public.org_members m
    join auth.users u on u.id = m.user_id
    join public.organizations o on o.id = m.org_id
    where m.approved = false
    order by m.created_at desc;
end $$;

revoke execute on function public.list_pending_signups() from public, anon;
grant execute on function public.list_pending_signups() to authenticated;

-- ============================================================
-- approve_signup / reject_signup — bypass RLS so super-admin
-- can act on memberships in orgs they are not a member of.
-- ============================================================
create or replace function public.approve_signup(p_org_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_caller_email text;
begin
  select u.email into v_caller_email from auth.users u where u.id = auth.uid();
  if v_caller_email is null or lower(v_caller_email) <> 'florjan.salaj@gmail.com' then
    raise exception 'Forbidden';
  end if;
  update public.org_members
    set approved = true
    where org_id = p_org_id and user_id = p_user_id;
end $$;

create or replace function public.reject_signup(p_org_id uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_caller_email text;
begin
  select u.email into v_caller_email from auth.users u where u.id = auth.uid();
  if v_caller_email is null or lower(v_caller_email) <> 'florjan.salaj@gmail.com' then
    raise exception 'Forbidden';
  end if;
  delete from public.organizations where id = p_org_id;
end $$;

revoke execute on function public.approve_signup(uuid, uuid) from public, anon;
grant execute on function public.approve_signup(uuid, uuid) to authenticated;

revoke execute on function public.reject_signup(uuid) from public, anon;
grant execute on function public.reject_signup(uuid) to authenticated;
