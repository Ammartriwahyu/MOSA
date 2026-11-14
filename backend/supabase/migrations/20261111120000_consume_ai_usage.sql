
create or replace function public.consume_ai_usage(p_household_id uuid, p_day date, p_limit integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit is null or p_limit < 1 then
    return false;
  end if;

  insert into public.ai_usage as u (household_id, day, count)
  values (p_household_id, p_day, 1)
  on conflict (household_id, day) do update
    set count = u.count + 1
    where u.count < p_limit
  returning u.count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.consume_ai_usage(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_usage(uuid, date, integer) to service_role;
