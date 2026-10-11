-- M1: style preset on projects, global test voices, start RPC, test-phase caps

alter table public.projects add column style_preset text not null default 'flat_editorial'
  check (style_preset in ('flat_editorial','chalk_sketch','paper_cutout','ink_wash','isometric_clean','comic_halftone'));
grant insert (style_preset) on public.projects to authenticated;
grant update (style_preset) on public.projects to authenticated;

-- Global library voices (Fish public library; replace with our own designed voices before launch — D013)
insert into public.voices (user_id, provider, provider_voice_id, name, language, settings) values
  (null, 'fish', '536d3a5e000945adb7038665781a4aca', 'Ethan — calm educator (male)', 'en', '{"speed":1.0}'),
  (null, 'fish', '933563129e564b19a115bedd57b7406a', 'Sarah — warm conversational (female)', 'en', '{"speed":1.0}');

-- Test-phase caps live in one row so the RPC and worker agree
create table public.app_config (
  id boolean primary key default true check (id),
  max_test_duration_s int not null default 30,
  max_scenes_per_project int not null default 12
);
insert into public.app_config default values;
alter table public.app_config enable row level security;
create policy app_config_read on public.app_config for select to authenticated using (true);
revoke insert, update, delete on public.app_config from authenticated;
revoke all on public.app_config from anon;

-- Start a draft project: validates ownership + caps, moves to researching/scripting, wakes the orchestrator.
create or replace function public.rpc_start_project(p_project_id uuid) returns public.project_status
language plpgsql security definer set search_path = public, pgmq as $$
declare
  v public.projects%rowtype;
  cfg public.app_config%rowtype;
  next_status public.project_status;
begin
  select * into v from public.projects where id = p_project_id and user_id = auth.uid() for update;
  if not found then raise exception 'project not found' using errcode = '42501'; end if;
  if v.status <> 'draft' then raise exception 'project already started (%)', v.status using errcode = '22023'; end if;
  select * into cfg from public.app_config;
  if v.target_duration_s > cfg.max_test_duration_s then
    raise exception 'test phase: max duration is % s', cfg.max_test_duration_s using errcode = '22023';
  end if;
  if v.voice_id is null then raise exception 'choose a voice' using errcode = '22023'; end if;

  next_status := case when v.input_mode = 'topic' then 'researching' else 'scripting' end;
  update public.projects set status = next_status, status_detail = 'queued', progress = 2 where id = v.id;
  perform pgmq.send('orchestrate', jsonb_build_object('project_id', v.id));
  return next_status;
end $$;
revoke all on function public.rpc_start_project(uuid) from public, anon;
grant execute on function public.rpc_start_project(uuid) to authenticated;
