-- ============================================================
-- Audit triggers — log every INSERT/UPDATE/DELETE on key tables
-- ============================================================

create or replace function public.log_audit() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_org_id uuid;
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_row_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_action := 'DELETE';
    v_before := to_jsonb(old);
    v_after := null;
    v_row_id := old.id;
    v_org_id := old.org_id;
  elsif TG_OP = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_row_id := new.id;
    v_org_id := new.org_id;
    -- Detect soft delete vs restore vs normal update
    if old.deleted_at is null and new.deleted_at is not null then
      v_action := 'DELETE';
    elsif old.deleted_at is not null and new.deleted_at is null then
      v_action := 'RESTORE';
    else
      v_action := 'UPDATE';
    end if;
  else -- INSERT
    v_action := 'INSERT';
    v_before := null;
    v_after := to_jsonb(new);
    v_row_id := new.id;
    v_org_id := new.org_id;
  end if;

  insert into public.audit_log(org_id, user_id, table_name, row_id, action, before, after)
    values (v_org_id, auth.uid(), TG_TABLE_NAME, v_row_id, v_action, v_before, v_after);

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'projects','invoices','cost_contracts','cost_payments',
    'clients','beneficiaries','project_managers','business_lines'
  ])
  loop
    execute format('drop trigger if exists audit_%1$I on public.%1$I', t);
    execute format('create trigger audit_%1$I
                    after insert or update or delete on public.%1$I
                    for each row execute function public.log_audit()', t);
  end loop;
end $$;
