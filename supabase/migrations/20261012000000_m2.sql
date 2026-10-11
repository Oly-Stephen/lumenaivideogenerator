-- M2: credits ledger (reserve / charge / settle / grant / refund), approvals, redo scene, cancel.
-- Credits: 1 credit = $0.01 x app_config.credit_markup. Ledger rows are append-only (trigger from init).
-- Invariant per project: outstanding reservation = -(sum reservation) - (sum reservation_release) >= 0.

alter table public.app_config add column credit_markup numeric(6,3) not null default 1.0;
alter table public.projects add column estimate jsonb;
alter table public.projects add column llm_tier text not null default 'standard' check (llm_tier in ('standard','high'));
grant insert (llm_tier) on public.projects to authenticated;
alter table public.scenes add column animate_priority numeric(4,3) not null default 0.5;

-- ---------------------------------------------------------------- internal helpers (service role only)
create or replace function private.project_outstanding(p_project uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(-sum(delta) filter (where reason = 'reservation'), 0)::int
       - coalesce(sum(delta) filter (where reason = 'reservation_release'), 0)::int
  from public.credits_ledger where project_id = p_project
$$;

create or replace function private.user_balance(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credits_ledger where user_id = p_user
$$;

-- reserve credits for a project; serialised per user by locking the profile row (no concurrent overdraw)
create or replace function public.ledger_reserve(p_project uuid, p_credits int) returns int
language plpgsql security definer set search_path = public, private as $$
declare
  v_user uuid; v_bal int; v_cap int; v_today int; v_n int;
begin
  if p_credits <= 0 then return 0; end if;
  select user_id into v_user from public.projects where id = p_project;
  if v_user is null then raise exception 'project not found'; end if;
  select daily_credit_cap into v_cap from public.profiles where id = v_user for update;
  v_bal := private.user_balance(v_user);
  if v_bal < p_credits then
    raise exception 'insufficient credits: balance %, needed %', v_bal, p_credits using errcode = 'P0001', hint = 'insufficient_credits';
  end if;
  select coalesce(-sum(delta), 0) into v_today from public.credits_ledger
   where user_id = v_user and reason = 'reservation' and created_at >= date_trunc('day', now());
  if v_today + p_credits > v_cap then
    raise exception 'daily credit cap reached: % + % > %', v_today, p_credits, v_cap using errcode = 'P0001', hint = 'daily_cap';
  end if;
  select count(*) + 1 into v_n from public.credits_ledger where project_id = p_project and reason = 'reservation';
  insert into public.credits_ledger (user_id, project_id, reason, delta, idempotency_key, note)
  values (v_user, p_project, 'reservation', -p_credits, 'reserve:' || p_project || ':' || v_n, 'hold for generation');
  return p_credits;
end $$;

-- charge a finished job (idempotent); converts part of the outstanding hold into a charge
create or replace function public.ledger_charge(p_job uuid) returns int
language plpgsql security definer set search_path = public, private as $$
declare
  j public.jobs%rowtype; v_user uuid; v_credits int; v_out int; v_rel int; v_rows int; v_markup numeric;
begin
  select * into j from public.jobs where id = p_job;
  if not found or j.status <> 'succeeded' or coalesce(j.cost_usd, 0) <= 0 then return 0; end if;
  select user_id into v_user from public.projects where id = j.project_id;
  perform 1 from public.profiles where id = v_user for update;
  select credit_markup into v_markup from public.app_config;
  v_credits := ceil(j.cost_usd * 100 * coalesce(v_markup, 1))::int;

  insert into public.credits_ledger (user_id, project_id, job_id, reason, delta, idempotency_key, note)
  values (v_user, j.project_id, j.id, 'charge', -v_credits, 'charge:' || j.id, j.kind::text || ' ' || coalesce(j.endpoint, ''))
  on conflict (idempotency_key) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return 0; end if; -- already charged

  v_out := private.project_outstanding(j.project_id);
  v_rel := least(v_credits, greatest(v_out, 0));
  if v_rel > 0 then
    insert into public.credits_ledger (user_id, project_id, job_id, reason, delta, idempotency_key, note)
    values (v_user, j.project_id, j.id, 'reservation_release', v_rel, 'release:' || j.id, 'hold converted to charge');
  end if;
  update public.jobs set credits_charged = v_credits where id = j.id;
  update public.projects set spent_credits = spent_credits + v_credits where id = j.project_id;
  return v_credits;
end $$;

-- release whatever is still held for a project (on completion, failure, cancel)
create or replace function public.ledger_settle(p_project uuid) returns int
language plpgsql security definer set search_path = public, private as $$
declare v_user uuid; v_out int; v_n int;
begin
  select user_id into v_user from public.projects where id = p_project;
  if v_user is null then return 0; end if;
  perform 1 from public.profiles where id = v_user for update;
  v_out := private.project_outstanding(p_project);
  if v_out <= 0 then return 0; end if;
  select count(*) + 1 into v_n from public.credits_ledger where project_id = p_project and idempotency_key like 'settle:%';
  insert into public.credits_ledger (user_id, project_id, reason, delta, idempotency_key, note)
  values (v_user, p_project, 'reservation_release', v_out, 'settle:' || p_project || ':' || v_n, 'unused hold released');
  return v_out;
end $$;

create or replace function public.admin_grant(p_user uuid, p_credits int, p_note text, p_key text) returns int
language plpgsql security definer set search_path = public as $$
begin
  insert into public.credits_ledger (user_id, reason, delta, idempotency_key, note)
  values (p_user, 'grant', p_credits, p_key, p_note) on conflict (idempotency_key) do nothing;
  return p_credits;
end $$;

create or replace function public.admin_refund(p_job uuid, p_note text) returns int
language plpgsql security definer set search_path = public as $$
declare j public.jobs%rowtype; v_user uuid;
begin
  select * into j from public.jobs where id = p_job;
  if not found or j.credits_charged <= 0 then return 0; end if;
  select user_id into v_user from public.projects where id = j.project_id;
  insert into public.credits_ledger (user_id, project_id, job_id, reason, delta, idempotency_key, note)
  values (v_user, j.project_id, j.id, 'refund', j.credits_charged, 'refund:' || j.id, p_note) on conflict (idempotency_key) do nothing;
  return j.credits_charged;
end $$;

revoke all on function public.ledger_reserve(uuid,int), public.ledger_charge(uuid), public.ledger_settle(uuid),
  public.admin_grant(uuid,int,text,text), public.admin_refund(uuid,text),
  private.project_outstanding(uuid), private.user_balance(uuid) from public, anon, authenticated;
grant execute on function public.ledger_reserve(uuid,int), public.ledger_charge(uuid), public.ledger_settle(uuid),
  public.admin_grant(uuid,int,text,text), public.admin_refund(uuid,text) to service_role;

-- ---------------------------------------------------------------- user RPCs (ownership + status checked)
create or replace function public.rpc_submit_script_edit(p_project uuid, p_full_text text) returns int
language plpgsql security definer set search_path = public as $$
declare v public.projects%rowtype; s public.scripts%rowtype; v_words int; v_ver int;
begin
  select * into v from public.projects where id = p_project and user_id = auth.uid() for update;
  if not found then raise exception 'project not found' using errcode = '42501'; end if;
  if v.status <> 'awaiting_script_approval' then raise exception 'script can only be edited before approval' using errcode = '22023'; end if;
  if char_length(trim(p_full_text)) < 10 or char_length(p_full_text) > 20000 then raise exception 'script length out of range' using errcode = '22023'; end if;
  select * into s from public.scripts where id = v.current_script_id;
  v_words := coalesce(array_length(regexp_split_to_array(trim(p_full_text), '\s+'), 1), 0);
  select coalesce(max(version), 0) + 1 into v_ver from public.scripts where project_id = p_project;
  insert into public.scripts (project_id, version, source, language, prompt_version, research, hook, body, full_text, word_count, est_duration_s)
  values (p_project, v_ver, 'user_edit', v.language, s.prompt_version, s.research, s.hook,
          jsonb_set(coalesce(s.body, '{}'::jsonb), '{full_text}', to_jsonb(p_full_text)), p_full_text, v_words, round(v_words / 2.5, 2))
  returning version into v_ver;
  update public.projects set current_script_id = (select id from public.scripts where project_id = p_project and version = v_ver)
   where id = p_project;
  return v_ver;
end $$;

create or replace function public.rpc_approve_script(p_project uuid) returns void
language plpgsql security definer set search_path = public, pgmq as $$
begin
  update public.projects set status = 'planning', status_detail = 'Planning scenes…', progress = 12
   where id = p_project and user_id = auth.uid() and status = 'awaiting_script_approval';
  if not found then raise exception 'nothing to approve' using errcode = '22023'; end if;
  update public.scripts set approved_at = now() where id = (select current_script_id from public.projects where id = p_project);
  perform pgmq.send('orchestrate', jsonb_build_object('project_id', p_project));
end $$;

create or replace function public.rpc_set_scene_animate(p_scene uuid, p_animate boolean) returns void
language plpgsql security definer set search_path = public, pgmq as $$
declare v_project uuid;
begin
  select s.project_id into v_project from public.scenes s join public.projects p on p.id = s.project_id
   where s.id = p_scene and p.user_id = auth.uid() and p.status = 'awaiting_plan_approval';
  if v_project is null then raise exception 'scene not editable' using errcode = '22023'; end if;
  update public.scenes set animate = p_animate where id = p_scene;
  update public.projects set estimate_credits = null, estimate = null, status_detail = 'Recalculating cost…' where id = v_project;
  perform pgmq.send('orchestrate', jsonb_build_object('project_id', v_project));
end $$;

create or replace function public.rpc_set_quality(p_project uuid, p_quality public.quality_tier) returns void
language plpgsql security definer set search_path = public, pgmq as $$
declare n int;
begin
  if p_quality = 'premium' then raise exception 'premium arrives in M3' using errcode = '22023'; end if;
  update public.projects set quality = p_quality, estimate_credits = null, estimate = null, status_detail = 'Recalculating cost…'
   where id = p_project and user_id = auth.uid() and status = 'awaiting_plan_approval';
  if not found then raise exception 'project not editable' using errcode = '22023'; end if;
  if p_quality = 'standard' then
    update public.scenes set animate = true where project_id = p_project;
  else -- budget: animate the top ~30% by priority (at least one)
    select greatest(1, round(count(*) * 0.3))::int into n from public.scenes where project_id = p_project;
    update public.scenes s set animate = r.rk <= n
      from (select id, row_number() over (order by animate_priority desc, idx) rk from public.scenes where project_id = p_project) r
     where s.id = r.id;
  end if;
  perform pgmq.send('orchestrate', jsonb_build_object('project_id', p_project));
end $$;

create or replace function public.rpc_approve_plan(p_project uuid) returns void
language plpgsql security definer set search_path = public, pgmq as $$
declare v public.projects%rowtype;
begin
  select * into v from public.projects where id = p_project and user_id = auth.uid() for update;
  if not found or v.status <> 'awaiting_plan_approval' then raise exception 'nothing to approve' using errcode = '22023'; end if;
  if v.estimate_credits is null then raise exception 'cost is being recalculated — try again in a moment' using errcode = '22023'; end if;
  perform public.ledger_reserve(p_project, v.estimate_credits);
  update public.projects set status = 'locking_style', status_detail = 'Locking the visual style…', progress = 18,
         budget_cap_credits = coalesce(budget_cap_credits, ceil(v.estimate_credits * 1.3)::int)
   where id = p_project;
  perform pgmq.send('orchestrate', jsonb_build_object('project_id', p_project));
end $$;

create or replace function public.rpc_regenerate_scene(p_scene uuid, p_what text, p_visual_prompt text default null,
  p_motion_prompt text default null, p_new_seed boolean default true) returns int
language plpgsql security definer set search_path = public, pgmq as $$
declare s public.scenes%rowtype; v public.projects%rowtype; v_rev int;
begin
  if p_what not in ('keyframe','motion','both') then raise exception 'what must be keyframe, motion or both' using errcode = '22023'; end if;
  select * into s from public.scenes where id = p_scene for update;
  select * into v from public.projects where id = s.project_id and user_id = auth.uid() for update;
  if not found then raise exception 'scene not found' using errcode = '42501'; end if;
  if v.status <> 'completed' then raise exception 'scenes can be redone once the video is complete' using errcode = '22023'; end if;
  if p_what = 'motion' and not s.animate then raise exception 'this scene is a still — redo the keyframe instead' using errcode = '22023'; end if;
  v_rev := s.revision + 1;
  update public.scenes set
    revision = v_rev,
    visual_prompt = coalesce(nullif(trim(p_visual_prompt), ''), visual_prompt),
    motion_prompt = coalesce(nullif(trim(p_motion_prompt), ''), motion_prompt),
    seed = case when p_new_seed then abs(hashtext(v.project_seed::text || ':' || s.idx || ':' || v_rev))::bigint else seed end,
    keyframe_asset_id = case when p_what in ('keyframe','both') then null else keyframe_asset_id end,
    clip_asset_id = null, -- an animated scene always gets new motion (clip is made from the keyframe)
    status = 'pending', error = null
  where id = p_scene;
  update public.projects set status = 'generating_scenes', status_detail = 'Redoing scene ' || (s.idx + 1) || '…', progress = 50
   where id = v.id;
  perform pgmq.send('orchestrate', jsonb_build_object('project_id', v.id));
  return v_rev;
end $$;

create or replace function public.rpc_cancel_project(p_project uuid) returns void
language plpgsql security definer set search_path = public, pgmq as $$
begin
  update public.projects set status = 'canceled', status_detail = 'Canceled'
   where id = p_project and user_id = auth.uid() and status not in ('completed','failed','canceled');
  if not found then raise exception 'nothing to cancel' using errcode = '22023'; end if;
  update public.jobs set status = 'canceled' where project_id = p_project and status = 'queued';
  perform public.ledger_settle(p_project);
  perform pgmq.send('orchestrate', jsonb_build_object('project_id', p_project)); -- worker cancels in-flight fal requests
end $$;

revoke all on function public.rpc_submit_script_edit(uuid,text), public.rpc_approve_script(uuid), public.rpc_set_scene_animate(uuid,boolean),
  public.rpc_set_quality(uuid,public.quality_tier), public.rpc_approve_plan(uuid), public.rpc_regenerate_scene(uuid,text,text,text,boolean),
  public.rpc_cancel_project(uuid) from public, anon;
grant execute on function public.rpc_submit_script_edit(uuid,text), public.rpc_approve_script(uuid), public.rpc_set_scene_animate(uuid,boolean),
  public.rpc_set_quality(uuid,public.quality_tier), public.rpc_approve_plan(uuid), public.rpc_regenerate_scene(uuid,text,text,text,boolean),
  public.rpc_cancel_project(uuid) to authenticated;

-- ---------------------------------------------------------------- live balance: private broadcast per user
create or replace function private.user_topic_allowed(topic text) returns boolean
language sql stable security definer set search_path = public as $$
  select topic = 'user:' || auth.uid()::text
$$;
grant execute on function private.user_topic_allowed(text) to authenticated;
create policy rt_user_read on realtime.messages for select to authenticated
  using (private.user_topic_allowed(realtime.topic()));

create or replace function public.broadcast_ledger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(jsonb_build_object('reason', new.reason, 'delta', new.delta), 'ledger', 'user:' || new.user_id::text, true);
  return null;
end $$;
revoke execute on function public.broadcast_ledger() from public, anon, authenticated;
create trigger rt_ledger after insert on public.credits_ledger for each row execute function public.broadcast_ledger();
