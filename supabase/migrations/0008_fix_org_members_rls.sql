-- ============================================================
-- Fix privilege escalation in org_members RLS
--
-- The previous policy "insert own membership" only checked
-- (user_id = auth.uid()) — any authenticated user could insert
-- themselves into ANY org_id. Inserts into org_members happen
-- exclusively via the SECURITY DEFINER trigger
-- create_org_for_new_user() and the SECURITY DEFINER RPCs in
-- migrations 0006/0007, so the public INSERT policy is unsafe
-- and unneeded — drop it.
-- ============================================================

drop policy if exists "insert own membership" on public.org_members;
