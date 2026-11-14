
alter table public.medicines
  add column if not exists purpose text not null check (length(btrim(purpose)) > 0);
