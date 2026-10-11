-- The ledger is append-only, but deleting a project/job must be able to null the FK (ON DELETE SET NULL).
-- Allow exactly that update; everything else (and every DELETE) is still rejected.
create or replace function public.forbid_ledger_mutation() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE'
     and new.id = old.id and new.user_id = old.user_id and new.reason = old.reason and new.delta = old.delta
     and new.idempotency_key is not distinct from old.idempotency_key and new.note is not distinct from old.note
     and new.created_at = old.created_at
     and (new.project_id is null or new.project_id = old.project_id)
     and (new.job_id is null or new.job_id = old.job_id) then
    return new;
  end if;
  raise exception 'credits_ledger is append-only';
end $$;
