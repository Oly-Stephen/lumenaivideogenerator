-- Security advisor fixes (lints 0011, 0028, 0029)

-- 1. pin search_path on plain trigger helpers
alter function public.set_updated_at() set search_path = public;
alter function public.forbid_ledger_mutation() set search_path = public;

-- 2. trigger functions must never be callable via /rest/v1/rpc (triggers still fire: they run as table owner)
revoke execute on function public.handle_new_user()        from public, anon, authenticated;
revoke execute on function public.broadcast_child_change() from public, anon, authenticated;
revoke execute on function public.broadcast_project_row()  from public, anon, authenticated;

-- 3. RLS helpers live in a non-exposed schema: policies keep working (bound by OID), but no RPC endpoint exists
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
alter function public.owns_project(uuid)          set schema private;
alter function public.project_topic_allowed(text) set schema private;
alter function private.project_topic_allowed(text) set search_path = public, private;

create or replace function private.project_topic_allowed(topic text) returns boolean
language plpgsql stable security definer set search_path = public, private as $$
declare pid uuid;
begin
  if topic !~ '^project:[0-9a-f-]{36}$' then return false; end if;
  pid := substring(topic from 9)::uuid;
  return private.owns_project(pid);
end $$;

-- 4. webhook_events is service-role only by design (no policies = no access for anon/authenticated)
comment on table public.webhook_events is 'fal webhook dedupe log; service role only (intentionally no RLS policies)';
