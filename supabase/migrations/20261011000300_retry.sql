-- Resume a failed project from the step that failed (recorded by the worker in projects.error->>'step').
create or replace function public.rpc_retry_project(p_project_id uuid) returns public.project_status
language plpgsql security definer set search_path = public, pgmq as $$
declare
  v public.projects%rowtype;
  step text;
begin
  select * into v from public.projects where id = p_project_id and user_id = auth.uid() for update;
  if not found then raise exception 'project not found' using errcode = '42501'; end if;
  if v.status not in ('failed', 'paused_insufficient_credits') then
    raise exception 'only failed or paused projects can be retried' using errcode = '22023';
  end if;
  step := coalesce(v.error->>'step', case when v.status = 'paused_insufficient_credits' then 'generating_scenes' else
    case when v.input_mode = 'topic' then 'researching' else 'scripting' end end);
  if step is null or step not in ('researching','scripting','planning','locking_style','narrating','generating_scenes','assembling','rendering') then
    raise exception 'cannot determine where to resume' using errcode = '22023';
  end if;
  update public.projects set status = step::public.project_status, status_detail = 'Retrying…', error = null where id = v.id;
  -- clear failed (not succeeded) jobs so they are re-attempted; succeeded work is reused
  update public.jobs set status = 'canceled' where project_id = v.id and status in ('failed','submitting','submitted','in_progress');
  perform pgmq.send('orchestrate', jsonb_build_object('project_id', v.id));
  return step::public.project_status;
end $$;
revoke all on function public.rpc_retry_project(uuid) from public, anon;
grant execute on function public.rpc_retry_project(uuid) to authenticated;
