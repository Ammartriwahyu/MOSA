
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  data_consent_at timestamptz,
  scan_consent_at timestamptz,
  output_mode text check (output_mode in ('teks', 'suara')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  name_normalized text not null check (length(name_normalized) > 0),
  strength text not null check (length(btrim(strength)) > 0),
  strength_normalized text not null check (length(strength_normalized) > 0),
  dose_amount text not null check (length(btrim(dose_amount)) > 0),
  usage_rule text not null check (length(btrim(usage_rule)) > 0),
  warnings text,
  notes text,

  intake_times text[] not null check (
    cardinality(intake_times) > 0
    and array_to_string(intake_times, ',') ~ '^([01][0-9]|2[0-3]):[0-5][0-9](,([01][0-9]|2[0-3]):[0-5][0-9])*$'
  ),
  label_source text not null check (label_source in ('apoteker', 'keluarga')),
  explanation text,
  explanation_origin text not null check (explanation_origin in ('ai_dikonfirmasi', 'teks_pengisi')),
  active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint medicines_explanation_matches_origin
    check ((explanation_origin = 'ai_dikonfirmasi') = (explanation is not null))
);

create index if not exists medicines_household_active_idx
  on public.medicines (household_id) where active;

create table if not exists public.dose_confirmations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id) on delete cascade,
  scheduled_date date not null,
  scheduled_time time not null,
  confirmed_at timestamptz not null,
  level text not null check (level in ('dasar', 'scan_terverifikasi')),

  constraint dose_confirmations_once_per_slot unique (medicine_id, scheduled_date, scheduled_time)
);

create index if not exists dose_confirmations_household_date_idx
  on public.dose_confirmations (household_id, scheduled_date);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);

create table if not exists public.reminder_dispatches (
  medicine_id uuid not null references public.medicines (id) on delete cascade,
  scheduled_date date not null,
  scheduled_time time not null,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (medicine_id, scheduled_date, scheduled_time, kind)
);

create table if not exists public.ai_usage (
  household_id uuid not null references public.households (id) on delete cascade,
  day date not null,
  count int not null default 0 check (count >= 0),
  primary key (household_id, day)
);

alter table public.households enable row level security;
alter table public.medicines enable row level security;
alter table public.dose_confirmations enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_dispatches enable row level security;
alter table public.ai_usage enable row level security;

revoke all on table
  public.households,
  public.medicines,
  public.dose_confirmations,
  public.push_subscriptions,
  public.reminder_dispatches,
  public.ai_usage
from anon, authenticated;
