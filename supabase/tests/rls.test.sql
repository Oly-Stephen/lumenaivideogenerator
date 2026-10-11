-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- two users
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', 'authenticated', 'authenticated');

select is((select count(*)::int from public.profiles where id in
  ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b')), 2, 'profiles auto-created');

-- seed as service role (postgres): one project per user, with a scene, job, asset
insert into public.projects (id, user_id, input_mode, input_text, target_duration_s) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'topic', 'why cats purr', 30),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'topic', 'why sky is blue', 30);
insert into public.scenes (project_id, idx, narration, visual_prompt, seed) values
  ('10000000-0000-0000-0000-00000000000a', 0, 'n', 'v', 1),
  ('10000000-0000-0000-0000-00000000000b', 0, 'n', 'v', 1);
insert into public.jobs (project_id, kind, provider, idempotency_key, input) values
  ('10000000-0000-0000-0000-00000000000b', 'image_keyframe', 'fal', 'k-b', '{}');
insert into public.assets (user_id, project_id, kind, r2_key, content_type, source) values
  ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'image', 'u/b/p/x.png', 'image/png', 'test');
insert into public.credits_ledger (user_id, reason, delta, idempotency_key) values
  ('00000000-0000-0000-0000-00000000000b', 'grant', 2000, 'grant:b');

-- act as user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::int from public.projects), 1, 'A sees only own project');
select is((select count(*)::int from public.scenes), 1, 'A sees only own scenes');
select is((select count(*)::int from public.jobs), 0, 'A cannot see B jobs');
select is((select count(*)::int from public.assets), 0, 'A cannot see B assets');
select is((select count(*)::int from public.credits_ledger), 0, 'A cannot see B ledger');
select ok(private.project_topic_allowed('project:10000000-0000-0000-0000-00000000000a'), 'A may join own realtime topic');
select ok(not private.project_topic_allowed('project:10000000-0000-0000-0000-00000000000b'), 'A may not join B topic');
select ok(not private.project_topic_allowed('project:not-a-uuid'), 'malformed topic rejected');

select lives_ok($$ insert into public.projects (user_id, input_mode, input_text, target_duration_s)
                   values ('00000000-0000-0000-0000-00000000000a','script','hello world',30) $$,
                'A can create own draft project');
select throws_ok($$ insert into public.projects (user_id, input_mode, input_text, target_duration_s)
                    values ('00000000-0000-0000-0000-00000000000b','topic','x',30) $$,
                 '42501', null, 'A cannot create project for B');
select throws_ok($$ insert into public.credits_ledger (user_id, reason, delta) values
                    ('00000000-0000-0000-0000-00000000000a','grant',999999) $$,
                 '42501', null, 'A cannot grant itself credits');

update public.projects set title = 'hacked' where id = '10000000-0000-0000-0000-00000000000b';
reset role;
select is((select title from public.projects where id = '10000000-0000-0000-0000-00000000000b'), null,
          'A update on B project had no effect');

-- anon sees nothing
set local role anon;
select throws_ok($$ select count(*) from public.projects $$, '42501', null, 'anon has no table access');
reset role;

select * from finish();
rollback;
