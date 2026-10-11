-- Lumen — initial schema (docs/03_IMPLEMENTATION_PLAN.md §2)
-- Users read their own rows; pipeline tables are written by the service role or security-definer RPCs.

create extension if not exists pgcrypto;
create extension if not exists pgmq;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create type public.project_format as enum ('short_9x16','full_16x9');
create type public.quality_tier   as enum ('budget','standard','premium');
create type public.project_status as enum (
  'draft','researching','scripting','awaiting_script_approval',
  'planning','awaiting_plan_approval','locking_style','narrating',
  'generating_scenes','assembling','rendering','completed',
  'failed','canceled','paused_insufficient_credits');
create type public.scene_status   as enum (
  'pending','keyframe_queued','keyframe_ready','motion_queued',
  'motion_ready','ready','failed','needs_review');
create type public.job_status     as enum ('queued','submitting','submitted','in_progress','succeeded','failed','canceled','dead');
create type public.job_kind       as enum (
  'llm_research','llm_script','llm_plan','llm_titles','llm_shorts','llm_content_plan','llm_translate','llm_qa',
  'image_style_frame','image_character_sheet','image_keyframe','image_thumbnail',
  'video_motion','tts_chapter','stt_align','voice_clone','music_bed',
  'upscale','render_master','render_short','ingest_asset');
create type public.asset_kind     as enum ('image','video','audio','subtitle','json','archive');
create type public.ledger_reason  as enum ('grant','purchase','reservation','reservation_release','charge','refund','adjustment');

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  plan              text not null default 'test',
  max_concurrent_projects int not null default 1,
  daily_credit_cap  int  not null default 1000,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_profiles_upd before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id) values (new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- assets (R2 registry)
create table public.assets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  project_id      uuid,                                  -- FK added after projects
  kind            public.asset_kind not null,
  r2_key          text not null unique,
  content_type    text not null,
  bytes           bigint,
  width int, height int, duration_ms int, fps numeric(6,3),
  sha256          text,
  source          text not null,
  source_request_id text,
  meta            jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ---------------------------------------------------------------- style bibles
create table public.style_bibles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  preset_key      text,
  spec            jsonb not null,
  system_prompt   text not null,
  style_frame_asset_id uuid references public.assets(id),
  seed            bigint not null default (floor(random()*2147483647))::bigint,
  is_locked       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_sb_upd before update on public.style_bibles for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- voices + consent
create table public.voice_consents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  speaker_name    text not null,
  attestation     text not null,
  consent_phrase  text not null,
  consent_recording_asset_id uuid references public.assets(id),
  stt_match_score numeric(4,3),
  ip_hash         text,
  created_at      timestamptz not null default now()
);

create table public.voices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,   -- null = global library voice
  provider        text not null check (provider in ('fish','minimax','elevenlabs')),
  provider_voice_id text not null,
  name            text not null,
  language        text not null default 'en',
  is_cloned       boolean not null default false,
  settings        jsonb not null default '{}',
  sample_asset_id uuid references public.assets(id),
  consent_id      uuid references public.voice_consents(id),
  last_used_at    timestamptz,
  created_at      timestamptz not null default now(),
  constraint cloned_requires_consent check (not is_cloned or consent_id is not null),
  constraint cloned_requires_owner   check (not is_cloned or user_id is not null)
);

-- ---------------------------------------------------------------- projects
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text,
  input_mode      text not null check (input_mode in ('topic','script')),
  input_text      text not null check (char_length(input_text) between 1 and 20000),
  source_urls     text[] not null default '{}',
  format          public.project_format not null default 'short_9x16',
  target_duration_s int not null check (target_duration_s between 15 and 600),
  quality         public.quality_tier not null default 'standard',
  language        text not null default 'en',
  style_bible_id  uuid references public.style_bibles(id),
  voice_id        uuid references public.voices(id),
  subtitles       boolean not null default true,
  music           boolean not null default true,
  autopilot       boolean not null default false,
  status          public.project_status not null default 'draft',
  status_detail   text,
  progress        numeric(5,2) not null default 0,
  project_seed    bigint not null default (floor(random()*2147483647))::bigint,
  estimate_credits int,
  spent_credits   int not null default 0,
  budget_cap_credits int,
  current_script_id uuid,
  final_render_id uuid,
  error           jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index projects_user_created_idx on public.projects(user_id, created_at desc);
create trigger trg_projects_upd before update on public.projects for each row execute function public.set_updated_at();
alter table public.assets add constraint assets_project_fk foreign key (project_id) references public.projects(id) on delete cascade;
create index assets_project_idx on public.assets(project_id);

-- ---------------------------------------------------------------- scripts & chapters
create table public.scripts (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  version         int not null,
  source          text not null check (source in ('ai','user_edit','translation')),
  language        text not null default 'en',
  prompt_version  text,
  research        jsonb,
  hook            text,
  body            jsonb not null,
  full_text       text not null,
  word_count      int not null,
  est_duration_s  numeric(7,2) not null,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (project_id, version)
);
alter table public.projects add constraint projects_script_fk foreign key (current_script_id) references public.scripts(id);

create table public.chapters (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  script_id       uuid not null references public.scripts(id) on delete cascade,
  idx             int not null,
  title           text not null,
  narration       text not null,
  audio_asset_id  uuid references public.assets(id),
  start_ms int, end_ms int,
  unique (script_id, idx)
);

-- ---------------------------------------------------------------- characters
create table public.characters (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  ref_tag         text not null,
  description     text not null,
  sheet_asset_id  uuid references public.assets(id),
  ref_asset_ids   uuid[] not null default '{}',
  seed            bigint not null default (floor(random()*2147483647))::bigint,
  is_locked       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------- scenes
create table public.scenes (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  chapter_id      uuid references public.chapters(id) on delete set null,
  idx             int not null,
  revision        int not null default 1,
  narration       text not null,
  word_start int, word_end int,
  start_ms int, end_ms int,
  duration_ms     int generated always as (end_ms - start_ms) stored,
  shot_type       text,
  visual_prompt   text not null,
  motion_prompt   text,
  character_ids   uuid[] not null default '{}',
  location_key    text,
  on_screen_text  text,
  animate         boolean not null default true,
  seed            bigint not null,
  status          public.scene_status not null default 'pending',
  keyframe_asset_id uuid references public.assets(id),
  keyframe_alt_asset_id uuid references public.assets(id),
  clip_asset_id   uuid references public.assets(id),
  qa              jsonb,
  attempts        int not null default 0,
  error           jsonb,
  updated_at      timestamptz not null default now(),
  unique (project_id, idx),
  check (end_ms is null or start_ms is null or end_ms > start_ms)
);
create index scenes_project_status_idx on public.scenes(project_id, status);
create trigger trg_scenes_upd before update on public.scenes for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- jobs
create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  scene_id        uuid references public.scenes(id) on delete cascade,
  kind            public.job_kind not null,
  provider        text not null check (provider in ('fal','fish','anthropic','worker')),
  endpoint        text,
  idempotency_key text not null unique,
  status          public.job_status not null default 'queued',
  priority        smallint not null default 5 check (priority between 1 and 9),
  input           jsonb not null,
  output          jsonb,
  fal_request_id  text unique,
  prompt_version  text,
  attempts        int not null default 0,
  max_attempts    int not null default 3,
  next_attempt_at timestamptz not null default now(),
  est_cost_usd    numeric(10,4),
  cost_usd        numeric(10,4),
  credits_charged int not null default 0,
  error           jsonb,
  submitted_at timestamptz, started_at timestamptz, finished_at timestamptz,
  created_at      timestamptz not null default now()
);
create index jobs_project_kind_status_idx on public.jobs(project_id, kind, status);
create index jobs_status_next_idx on public.jobs(status, next_attempt_at);
create index jobs_provider_status_idx on public.jobs(provider, status);

create table public.webhook_events (
  request_id      text primary key,
  received_at     timestamptz not null default now(),
  status          text not null,
  payload         jsonb
);

-- ---------------------------------------------------------------- outputs
create table public.renders (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  kind            text not null check (kind in ('master','preview','dub')),
  aspect          text not null check (aspect in ('16:9','9:16')),
  resolution      text not null,
  language        text not null default 'en',
  edl             jsonb not null,
  asset_id        uuid references public.assets(id),
  subtitle_asset_id uuid references public.assets(id),
  status          public.job_status not null default 'queued',
  created_at      timestamptz not null default now()
);
alter table public.projects add constraint projects_render_fk foreign key (final_render_id) references public.renders(id);

create table public.shorts (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  source_render_id uuid references public.renders(id),
  idx             int not null,
  title           text,
  hook_text       text,
  start_ms int not null, end_ms int not null,
  scene_ids       uuid[] not null default '{}',
  asset_id        uuid references public.assets(id),
  status          public.job_status not null default 'queued',
  unique (project_id, idx),
  check (end_ms > start_ms)
);

create table public.thumbnails (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  title_text      text not null,
  prompt          text not null,
  asset_id        uuid references public.assets(id),
  is_selected     boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.content_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  niche           text not null,
  days            int not null default 30,
  plan            jsonb not null,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------- credits ledger (append-only)
create table public.credits_ledger (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  job_id          uuid references public.jobs(id) on delete set null,
  reason          public.ledger_reason not null,
  delta           int not null,
  idempotency_key text unique,
  note            text,
  created_at      timestamptz not null default now()
);
create index credits_ledger_user_idx on public.credits_ledger(user_id, created_at);

create or replace function public.forbid_ledger_mutation() returns trigger
language plpgsql as $$ begin raise exception 'credits_ledger is append-only'; end $$;
create trigger trg_ledger_append_only before update or delete on public.credits_ledger
  for each row execute function public.forbid_ledger_mutation();

create view public.credit_balances with (security_invoker = true) as
  select user_id, coalesce(sum(delta),0)::int as balance from public.credits_ledger group by user_id;

-- ---------------------------------------------------------------- RLS
alter table public.profiles       enable row level security;
alter table public.assets         enable row level security;
alter table public.style_bibles   enable row level security;
alter table public.voice_consents enable row level security;
alter table public.voices         enable row level security;
alter table public.projects       enable row level security;
alter table public.scripts        enable row level security;
alter table public.chapters       enable row level security;
alter table public.characters     enable row level security;
alter table public.scenes         enable row level security;
alter table public.jobs           enable row level security;
alter table public.webhook_events enable row level security;
alter table public.renders        enable row level security;
alter table public.shorts         enable row level security;
alter table public.thumbnails     enable row level security;
alter table public.content_plans  enable row level security;
alter table public.credits_ledger enable row level security;

-- anon never touches app data
revoke all on all tables in schema public from anon;

create or replace function public.owns_project(p uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.projects where id = p and user_id = auth.uid()) $$;
revoke all on function public.owns_project(uuid) from public, anon;
grant execute on function public.owns_project(uuid) to authenticated;

create policy profiles_sel on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_upd on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy sel_own on public.projects       for select to authenticated using (user_id = auth.uid());
create policy sel_own on public.style_bibles   for select to authenticated using (user_id = auth.uid());
create policy sel_own on public.characters     for select to authenticated using (user_id = auth.uid());
create policy sel_own on public.assets         for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy sel_own on public.content_plans  for select to authenticated using (user_id = auth.uid());
create policy sel_own on public.credits_ledger for select to authenticated using (user_id = auth.uid());
create policy sel_own on public.voice_consents for select to authenticated using (user_id = auth.uid());
create policy sel_own on public.voices         for select to authenticated using (user_id = auth.uid() or user_id is null);

create policy sel_own on public.scripts    for select to authenticated using (public.owns_project(project_id));
create policy sel_own on public.chapters   for select to authenticated using (public.owns_project(project_id));
create policy sel_own on public.scenes     for select to authenticated using (public.owns_project(project_id));
create policy sel_own on public.jobs       for select to authenticated using (public.owns_project(project_id));
create policy sel_own on public.renders    for select to authenticated using (public.owns_project(project_id));
create policy sel_own on public.shorts     for select to authenticated using (public.owns_project(project_id));
create policy sel_own on public.thumbnails for select to authenticated using (public.owns_project(project_id));
-- webhook_events: no policies => service role only

-- direct user writes: create a draft project, edit editable fields while editable
create policy ins_own on public.projects for insert to authenticated
  with check (user_id = auth.uid() and status = 'draft');
create policy upd_editable on public.projects for update to authenticated
  using (user_id = auth.uid() and status in ('draft','awaiting_script_approval','awaiting_plan_approval'))
  with check (user_id = auth.uid());
revoke insert, update on public.projects from authenticated;
grant insert (user_id, title, input_mode, input_text, source_urls, format, target_duration_s, quality,
              language, style_bible_id, voice_id, subtitles, music, autopilot, budget_cap_credits)
  on public.projects to authenticated;
grant update (title, input_text, source_urls, format, target_duration_s, quality, language,
              style_bible_id, voice_id, subtitles, music, autopilot, budget_cap_credits)
  on public.projects to authenticated;

create policy ins_own on public.style_bibles for insert to authenticated with check (user_id = auth.uid() and not is_locked);
create policy upd_own on public.style_bibles for update to authenticated using (user_id = auth.uid() and not is_locked)
  with check (user_id = auth.uid() and not is_locked);

-- every other write: service role or security-definer RPCs (added in M1/M2)
revoke insert, update, delete on public.scripts, public.chapters, public.characters, public.scenes, public.jobs,
  public.renders, public.shorts, public.thumbnails, public.content_plans, public.credits_ledger,
  public.assets, public.voices, public.voice_consents, public.webhook_events from authenticated;

-- ---------------------------------------------------------------- Realtime (private broadcast per project)
create or replace function public.project_topic_allowed(topic text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare pid uuid;
begin
  if topic !~ '^project:[0-9a-f-]{36}$' then return false; end if;
  pid := substring(topic from 9)::uuid;
  return public.owns_project(pid);
end $$;
revoke all on function public.project_topic_allowed(text) from public, anon;
grant execute on function public.project_topic_allowed(text) to authenticated;

create policy rt_project_read on realtime.messages for select to authenticated
  using (public.project_topic_allowed(realtime.topic()));

create or replace function public.broadcast_child_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(
    jsonb_build_object('table', tg_table_name, 'id', new.id, 'status', to_jsonb(new)->>'status'),
    tg_table_name, 'project:' || new.project_id::text, true);
  return null;
end $$;

create or replace function public.broadcast_project_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(
    jsonb_build_object('table','projects','id',new.id,'status',new.status,'progress',new.progress,'status_detail',new.status_detail),
    'projects', 'project:' || new.id::text, true);
  return null;
end $$;

create trigger rt_projects after update on public.projects for each row execute function public.broadcast_project_row();
create trigger rt_scenes   after insert or update on public.scenes  for each row execute function public.broadcast_child_change();
create trigger rt_jobs     after insert or update on public.jobs    for each row execute function public.broadcast_child_change();
create trigger rt_renders  after insert or update on public.renders for each row execute function public.broadcast_child_change();

-- ---------------------------------------------------------------- Queues (service role only)
select pgmq.create('orchestrate');
select pgmq.create('fal_submit');
select pgmq.create('llm');
select pgmq.create('ingest');
select pgmq.create('render');

-- ---------------------------------------------------------------- fal budget guard (D009)
-- Sum of reconciled + estimated in-flight fal spend, all time. fal-submit refuses jobs that would exceed the cap.
create or replace function public.fal_spend_usd() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(coalesce(cost_usd,
           case when status in ('submitting','submitted','in_progress') then est_cost_usd else 0 end)), 0)
  from public.jobs where provider = 'fal'
$$;
revoke all on function public.fal_spend_usd() from public, anon, authenticated;

-- ---------------------------------------------------------------- fal webhook application (service role only)
-- Idempotent: duplicate deliveries are recorded once; a job is only advanced from submitted/in_progress.
create or replace function public.apply_fal_webhook(p_request_id text, p_status text, p_payload jsonb, p_error text)
returns text
language plpgsql security definer set search_path = public, pgmq as $$
declare
  v_job public.jobs%rowtype;
  v_inserted int;
begin
  insert into public.webhook_events(request_id, status, payload)
  values (p_request_id, p_status, p_payload)
  on conflict (request_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;

  select * into v_job from public.jobs where fal_request_id = p_request_id for update;
  if not found then return 'unknown_request'; end if;
  if v_job.status not in ('submitting','submitted','in_progress') then return 'ignored_' || v_job.status::text; end if;

  if p_status = 'OK' then
    update public.jobs set status = 'succeeded', output = p_payload, finished_at = now() where id = v_job.id;
    perform pgmq.send('ingest', jsonb_build_object('job_id', v_job.id));
  else
    update public.jobs
       set status = case when attempts + 1 >= max_attempts then 'dead'::public.job_status else 'failed'::public.job_status end,
           attempts = attempts + 1,
           error = jsonb_build_object('message', p_error, 'payload', p_payload),
           next_attempt_at = now() + make_interval(secs => (15 * power(2, attempts))::int),
           finished_at = now()
     where id = v_job.id;
  end if;
  perform pgmq.send('orchestrate', jsonb_build_object('project_id', v_job.project_id));
  return 'applied';
end $$;
revoke all on function public.apply_fal_webhook(text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.apply_fal_webhook(text, text, jsonb, text) to service_role;
