-- Backend saja. Satu endpoint tidak dapat dipindahkan ke rumah tangga lain.
-- Kunci parent menserialisasi batas 10 perangkat, termasuk permintaan bersamaan.
create or replace function public.register_push_subscription(
  p_household_id uuid, p_endpoint text, p_p256dh text, p_auth text
) returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare registered uuid;
begin
  perform 1 from public.households where id = p_household_id and data_consent_at is not null for update;
  if not found then return false; end if;
  if not exists (select 1 from public.push_subscriptions where household_id = p_household_id and endpoint = p_endpoint)
     and (select count(*) from public.push_subscriptions where household_id = p_household_id) >= 10 then
    return false;
  end if;
  insert into public.push_subscriptions(household_id, endpoint, p256dh, auth)
    values (p_household_id, p_endpoint, p_p256dh, p_auth)
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth
      where push_subscriptions.household_id = excluded.household_id
    returning id into registered;
  return registered is not null;
end $$;

-- Klaim per slot DAN perangkat; dua HP boleh mendapat pengingat yang sama.
-- Catatan berarti percobaan sudah diklaim, bukan bukti notifikasi terlihat.
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
       and ((p_scheduled_date + p_scheduled_time) at time zone 'Asia/Jakarta') >= created_at
       and ((p_scheduled_date + p_scheduled_time) at time zone 'Asia/Jakarta') >=
         (intake_times_started_at ->> to_char(p_scheduled_time, 'HH24:MI'))::timestamptz)
     or exists (select 1 from public.dose_confirmations where medicine_id = p_medicine_id
       and scheduled_date = p_scheduled_date and scheduled_time = p_scheduled_time) then return false; end if;
  insert into public.reminder_dispatches(medicine_id, scheduled_date, scheduled_time, kind)
    values (p_medicine_id, p_scheduled_date, p_scheduled_time, 'push:' || p_subscription_id::text)
    on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end $$;

revoke all on function public.register_push_subscription(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.claim_push_reminder(uuid, uuid, uuid, date, time) from public, anon, authenticated;
grant execute on function public.register_push_subscription(uuid, text, text, text) to service_role;
grant execute on function public.claim_push_reminder(uuid, uuid, uuid, date, time) to service_role;
