
create or replace function public.confirm_scanned_dose(
  p_household_id uuid, p_medicine_id uuid, p_scheduled_date date,
  p_scheduled_time time, p_confirmed_at timestamptz, p_level text,
  p_opens_before_minutes integer, p_closes_after_minutes integer,
  p_expected_name text, p_expected_strength text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  medicine public.medicines%rowtype;
begin
  select * into medicine from public.medicines
    where id = p_medicine_id and household_id = p_household_id and active for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  if p_level is distinct from 'scan_terverifikasi'
     or p_expected_name is null or p_expected_strength is null
     or medicine.name is distinct from p_expected_name
     or medicine.strength is distinct from p_expected_strength then
    return jsonb_build_object('code', 'SCAN_TOKEN_INVALID');
  end if;

  return public.confirm_dose(p_household_id, p_medicine_id, p_scheduled_date, p_scheduled_time,
    p_confirmed_at, p_level, p_opens_before_minutes, p_closes_after_minutes);
end;
$$;

revoke all on function public.confirm_scanned_dose(uuid, uuid, date, time, timestamptz, text, integer, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.confirm_scanned_dose(uuid, uuid, date, time, timestamptz, text, integer, integer, text, text)
  to service_role;
