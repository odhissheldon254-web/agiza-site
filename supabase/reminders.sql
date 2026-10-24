-- Agiza Office: phone reminders (web push). Run after setup.sql, in Supabase > SQL Editor.
-- Safe to run again.
--
-- How it works: the office saves each phone that turns on reminders in push_subscriptions.
-- Every minute, pg_cron calls the "reminders" Edge Function (supabase/functions/reminders),
-- which sends a notification for each to-do whose reminder time has come and each meeting
-- about to start, then stamps reminded_at so nothing is sent twice.

-- ---------- Reminder times ----------
alter table public.todos add column if not exists remind_at timestamptz;
alter table public.todos add column if not exists reminded_at timestamptz;
alter table public.meetings add column if not exists remind_min int not null default 30 check (remind_min between 0 and 1440);
alter table public.meetings add column if not exists reminded_at timestamptz;

-- Changing a reminder time (or a meeting's start) re-arms it.
create or replace function public.rearm_reminder() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'todos' then
    if new.remind_at is distinct from old.remind_at then new.reminded_at := null; end if;
  else
    if new.starts_at is distinct from old.starts_at or new.remind_min is distinct from old.remind_min then new.reminded_at := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists rearm_reminder on public.todos;
create trigger rearm_reminder before update on public.todos for each row execute function public.rearm_reminder();
drop trigger if exists rearm_reminder on public.meetings;
create trigger rearm_reminder before update on public.meetings for each row execute function public.rearm_reminder();

-- ---------- Phones that receive reminders ----------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique check (length(endpoint) <= 1000),
  p256dh      text not null check (length(p256dh) <= 200),
  auth        text not null check (length(auth) <= 100),
  created_at  timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "owner only" on public.push_subscriptions;
create policy "owner only" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create index if not exists push_subscriptions_owner_idx on public.push_subscriptions (owner);
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ---------- Signing keys for push (created by the Edge Function on first run) ----------
-- Lives outside "public", so the website API can never read it.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.vapid (
  id           int primary key default 1 check (id = 1),
  public_key   text not null,
  private_key  text not null
);

-- The public half, which the office needs to register a phone. Signed-in users may read it.
create table if not exists public.push_config (
  id          int primary key default 1 check (id = 1),
  public_key  text not null
);
alter table public.push_config enable row level security;
drop policy if exists "signed-in read" on public.push_config;
create policy "signed-in read" on public.push_config for select to authenticated using (true);
revoke all on public.push_config from anon;
grant select on public.push_config to authenticated;

-- ---------- Run the sender every minute ----------
-- The function keeps "Verify JWT" on, so the call carries the project's legacy anon key.
-- That key is public, but it is kept in Vault rather than in this file. Store it once with:
--   select vault.create_secret('<legacy anon key>', 'reminders_anon_key');
-- (Project Settings > API Keys > Legacy anon, service_role API keys > anon.)
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('agiza-reminders', '* * * * *', $$
  select net.http_post(
    url := 'https://piksliczqbyoivngkzii.supabase.co/functions/v1/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_anon_key')),
    body := '{}'::jsonb)
$$);
