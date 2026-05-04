-- ============================================================
-- Security hardening: lock SECURITY DEFINER functions
-- - Fix mutable search_path on set_updated_at
-- - Revoke EXECUTE on functions that should never be public RPC
-- - Keep user_orgs() executable for `authenticated` (RLS depends on it)
-- ============================================================

create or replace function public.set_updated_at() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Trigger-only functions: never called directly via RPC
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.log_audit() from public, anon, authenticated;
revoke execute on function public.create_org_for_new_user() from public, anon, authenticated;

-- user_orgs is used inside RLS policies → authenticated must keep EXECUTE.
-- anon never has a useful auth.uid(), so we strip access to avoid the public RPC surface.
revoke execute on function public.user_orgs() from public, anon;
grant execute on function public.user_orgs() to authenticated;
