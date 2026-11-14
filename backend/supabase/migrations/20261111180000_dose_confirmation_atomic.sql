
alter table public.medicines
  add column if not exists intake_times_started_at jsonb not null default '{}'::jsonb
  check (jsonb_typeof(intake_times_started_at) = 'object');

update public.medicines m
set intake_times_started_at = (
  select jsonb_object_agg(t, to_jsonb(m.created_at)) from unnest(m.intake_times) as t
)
where m.intake_times_started_at = '{}'::jsonb;

create or replace function public.track_intake_time_starts()
returns trigger language plpgsql set search_path = '' as $$
declare
  t text;
  started timestamptz;
  starts jsonb := '{}'::jsonb;
  supplied boolean;
begin
  supplied := tg_op = 'INSERT';
  if tg_op = 'UPDATE' then
    supplied := new.intake_times_started_at is distinct from old.intake_times_started_at;
  end if;
  foreach t in array new.intake_times loop
    if supplied and new.intake_times_started_at ? t then

      started := (new.intake_times_started_at ->> t)::timestamptz;
    elsif tg_op = 'UPDATE' and t = any(old.intake_times) then
      started := coalesce((old.intake_times_started_at ->> t)::timestamptz, old.created_at);
    elsif tg_op = 'INSERT' then
      started := new.created_at;
    else
      started := clock_timestamp();
    end if;
    if started is null then raise exception 'intake_times_started_at' using errcode = '23514'; end if;
    starts := starts || jsonb_build_object(t, started);
  end loop;
  new.intake_times_started_at := starts;
  return new;
end;
$$;

drop trigger if exists medicines_intake_time_starts on public.medicines;
create trigger medicines_intake_time_starts before insert or update on public.medicines
  for each row execute function public.track_intake_time_starts();

create or replace function public.confirm_dose(
  p_household_id uuid,
  p_medicine_id uuid,
  p_scheduled_date date,
  p_scheduled_time time,
  p_confirmed_at timestamptz,
  p_level text,
  p_opens_before_minutes integer,
  p_closes_after_minutes integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  medicine public.medicines%rowtype;
  recorded public.dose_confirmations%rowtype;
  scheduled_at timestamptz;
  started_at timestamptz;
  time_text text;
begin
  select * into medicine from public.medicines
    where id = p_medicine_id and household_id = p_household_id and active for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;

  select * into recorded from public.dose_confirmations
    where household_id = p_household_id and medicine_id = p_medicine_id
      and scheduled_date = p_scheduled_date and scheduled_time = p_scheduled_time;
  if found then return jsonb_build_object('code', 'DOSE_ALREADY_CONFIRMED'); end if;

  if p_level not in ('dasar', 'scan_terverifikasi')
     or p_level is null or p_confirmed_at is null
     or p_opens_before_minutes is null or p_closes_after_minutes is null
     or p_opens_before_minutes < 0 or p_closes_after_minutes < 0
     or p_scheduled_date is null or p_scheduled_time is null
     or extract(second from p_scheduled_time) <> 0 then
    return jsonb_build_object('code', 'VALIDATION_FAILED');
  end if;
  time_text := to_char(p_scheduled_time, 'HH24:MI');
  if not (time_text = any(medicine.intake_times)) then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  if not (medicine.intake_times_started_at ? time_text) then return jsonb_build_object('code', 'VALIDATION_FAILED'); end if;
  scheduled_at := (p_scheduled_date + p_scheduled_time) at time zone interval '+07:00';
  started_at := greatest(medicine.created_at, (medicine.intake_times_started_at ->> time_text)::timestamptz);
  if scheduled_at < started_at then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  if p_confirmed_at < scheduled_at - make_interval(mins => p_opens_before_minutes) then
    return jsonb_build_object('code', 'DOSE_NOT_DUE');
  end if;
  if p_confirmed_at > scheduled_at + make_interval(mins => p_closes_after_minutes) then
    return jsonb_build_object('code', 'DOSE_MISSED');
  end if;
  insert into public.dose_confirmations (household_id, medicine_id, scheduled_date, scheduled_time, confirmed_at, level)
    values (p_household_id, p_medicine_id, p_scheduled_date, p_scheduled_time, p_confirmed_at, p_level)
    returning * into recorded;
  return jsonb_build_object('code', 'OK', 'confirmation', to_jsonb(recorded));
exception when unique_violation then
  return jsonb_build_object('code', 'DOSE_ALREADY_CONFIRMED');
end;
$$;

revoke all on function public.track_intake_time_starts() from public, anon, authenticated;
revoke all on function public.confirm_dose(uuid, uuid, date, time, timestamptz, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.confirm_dose(uuid, uuid, date, time, timestamptz, text, integer, integer)
  to service_role;
