-- ============================================================
-- reject_signup: also delete auth.users to avoid zombie accounts
--
-- The previous version only deleted the organization (cascading
-- to org_members for that org). The auth.users row stayed,
-- letting the rejected user log back in to a stuck "/pending"
-- screen with no org and no way to recover (the
-- create_org_for_new_user trigger fires on insert only).
--
-- New behaviour: resolve the pending member's user_id, drop the
-- org, then if the user has no other org memberships delete the
-- auth.users row so they can re-signup with the same email.
-- ============================================================

create or replace function public.reject_signup(p_org_id uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_remaining int;
begin
  if not public.is_super_admin() then raise exception 'Forbidden'; end if;

  select user_id into v_user_id
  from public.org_members
  where org_id = p_org_id and approved = false
  limit 1;

  delete from public.organizations where id = p_org_id;

  if v_user_id is not null then
    select count(*) into v_remaining
    from public.org_members
    where user_id = v_user_id;

    if v_remaining = 0 then
      delete from auth.users where id = v_user_id;
    end if;
  end if;
end $$;
