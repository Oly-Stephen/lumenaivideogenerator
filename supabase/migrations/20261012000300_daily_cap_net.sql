-- Daily cap counts what is actually committed today: credits charged today + holds still outstanding.
-- (Previously it counted gross reservations, so released holds — e.g. canceled or mock runs — used up the cap.)
create or replace function public.ledger_reserve(p_project uuid, p_credits int) returns int
language plpgsql security definer set search_path = public, private as $$
declare
  v_user uuid; v_bal int; v_cap int; v_today int; v_held int; v_n int;
begin
  if p_credits <= 0 then return 0; end if;
  select user_id into v_user from public.projects where id = p_project;
  if v_user is null then raise exception 'project not found'; end if;
  select daily_credit_cap into v_cap from public.profiles where id = v_user for update;
  v_bal := private.user_balance(v_user);
  if v_bal < p_credits then
    raise exception 'insufficient credits: balance %, needed %', v_bal, p_credits using errcode = 'P0001', hint = 'insufficient_credits';
  end if;
  select coalesce(-sum(delta) filter (where reason = 'charge' and created_at >= date_trunc('day', now())), 0)::int,
         (coalesce(-sum(delta) filter (where reason = 'reservation'), 0) - coalesce(sum(delta) filter (where reason = 'reservation_release'), 0))::int
    into v_today, v_held
    from public.credits_ledger where user_id = v_user;
  if v_today + v_held + p_credits > v_cap then
    raise exception 'daily credit cap reached: charged % + held % + % > %', v_today, v_held, p_credits, v_cap using errcode = 'P0001', hint = 'daily_cap';
  end if;
  select count(*) + 1 into v_n from public.credits_ledger where project_id = p_project and reason = 'reservation';
  insert into public.credits_ledger (user_id, project_id, reason, delta, idempotency_key, note)
  values (v_user, p_project, 'reservation', -p_credits, 'reserve:' || p_project || ':' || v_n, 'hold for generation');
  return p_credits;
end $$;
revoke all on function public.ledger_reserve(uuid,int) from public, anon, authenticated;
grant execute on function public.ledger_reserve(uuid,int) to service_role;
