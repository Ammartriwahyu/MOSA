-- Hari minum per obat (ISO: 1 = Senin … 7 = Minggu). Bawaan semua hari = perilaku lama "setiap hari".
-- Seperti jam (Q5), hari yang baru ditambahkan hanya menghasilkan slot dengan J ≥ waktu pengaktifannya.
alter table public.medicines
  add column if not exists intake_days smallint[] not null default '{1,2,3,4,5,6,7}'
    check (cardinality(intake_days) between 1 and 7 and intake_days <@ '{1,2,3,4,5,6,7}'::smallint[]),
  add column if not exists intake_days_started_at jsonb not null default '{}'::jsonb
    check (jsonb_typeof(intake_days_started_at) = 'object');

update public.medicines m
set intake_days_started_at = (
  select jsonb_object_agg(d::text, to_jsonb(m.created_at)) from unnest(m.intake_days) as d
)
where m.intake_days_started_at = '{}'::jsonb;

create or replace function public.track_intake_day_starts()
returns trigger language plpgsql set search_path = '' as $$
declare
  d smallint;
  k text;
  started timestamptz;
  starts jsonb := '{}'::jsonb;
  supplied boolean;
begin
  supplied := tg_op = 'INSERT';
  if tg_op = 'UPDATE' then
    supplied := new.intake_days_started_at is distinct from old.intake_days_started_at;
  end if;
  foreach d in array new.intake_days loop
    k := d::text;
    if supplied and new.intake_days_started_at ? k then
      started := (new.intake_days_started_at ->> k)::timestamptz;
    elsif tg_op = 'UPDATE' and d = any(old.intake_days) then
      started := coalesce((old.intake_days_started_at ->> k)::timestamptz, old.created_at);
    elsif tg_op = 'INSERT' then
      started := new.created_at;
    else
      started := clock_timestamp();
    end if;
    if started is null then raise exception 'intake_days_started_at' using errcode = '23514'; end if;
    starts := starts || jsonb_build_object(k, started);
  end loop;
  new.intake_days_started_at := starts;
  return new;
end;
$$;

drop trigger if exists medicines_intake_day_starts on public.medicines;
create trigger medicines_intake_day_starts before insert or update on public.medicines
  for each row execute function public.track_intake_day_starts();

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
  day_text text;
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
  day_text := extract(isodow from p_scheduled_date)::int::text;
  if not (time_text = any(medicine.intake_times)) then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  if not (day_text::smallint = any(medicine.intake_days)) then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  if not (medicine.intake_times_started_at ? time_text) or not (medicine.intake_days_started_at ? day_text) then
    return jsonb_build_object('code', 'VALIDATION_FAILED');
  end if;
  scheduled_at := (p_scheduled_date + p_scheduled_time) at time zone interval '+07:00';
  started_at := greatest(medicine.created_at, (medicine.intake_times_started_at ->> time_text)::timestamptz,
    (medicine.intake_days_started_at ->> day_text)::timestamptz);
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

create or replace function public.claim_push_reminder(
  p_household_id uuid, p_subscription_id uuid, p_medicine_id uuid,
  p_scheduled_date date, p_scheduled_time time
) returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare inserted integer;
begin
  if not exists (select 1 from public.push_subscriptions where id = p_subscription_id and household_id = p_household_id)
     or not exists (select 1 from public.households where id = p_household_id and data_consent_at is not null)
     or not exists (select 1 from public.medicines where id = p_medicine_id and household_id = p_household_id and active
       and to_char(p_scheduled_time, 'HH24:MI') = any(intake_times)
       and extract(isodow from p_scheduled_date)::smallint = any(intake_days)
       and ((p_scheduled_date + p_scheduled_time) at time zone 'Asia/Jakarta') >= created_at
       and ((p_scheduled_date + p_scheduled_time) at time zone 'Asia/Jakarta') >=
         (intake_times_started_at ->> to_char(p_scheduled_time, 'HH24:MI'))::timestamptz
       and ((p_scheduled_date + p_scheduled_time) at time zone 'Asia/Jakarta') >=
         (intake_days_started_at ->> extract(isodow from p_scheduled_date)::int::text)::timestamptz)
     or exists (select 1 from public.dose_confirmations where medicine_id = p_medicine_id
       and scheduled_date = p_scheduled_date and scheduled_time = p_scheduled_time) then return false; end if;
  insert into public.reminder_dispatches(medicine_id, scheduled_date, scheduled_time, kind)
    values (p_medicine_id, p_scheduled_date, p_scheduled_time, 'push:' || p_subscription_id::text)
    on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end $$;

revoke all on function public.track_intake_day_starts() from public, anon, authenticated;
revoke all on function public.confirm_dose(uuid, uuid, date, time, timestamptz, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.confirm_dose(uuid, uuid, date, time, timestamptz, text, integer, integer)
  to service_role;
revoke all on function public.claim_push_reminder(uuid, uuid, uuid, date, time) from public, anon, authenticated;
grant execute on function public.claim_push_reminder(uuid, uuid, uuid, date, time) to service_role;
