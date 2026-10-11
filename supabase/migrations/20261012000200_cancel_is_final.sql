-- Cancel is final: a worker step that finishes after the user canceled must not move the project back.
create or replace function public.keep_canceled() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.status = 'canceled' then
    new.status := old.status;
    new.status_detail := old.status_detail;
    new.progress := old.progress;
  end if;
  return new;
end $$;
revoke execute on function public.keep_canceled() from public, anon, authenticated;
create trigger trg_keep_canceled before update on public.projects for each row execute function public.keep_canceled();
