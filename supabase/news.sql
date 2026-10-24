-- Agiza Office: insurance news for the office. Run after reminders.sql (it reuses the Vault key).
-- Safe to run again. The "news" Edge Function (supabase/functions/news) fills this table.

create table if not exists public.news (
  link          text primary key check (length(link) <= 2000),
  title         text not null check (length(title) <= 400),
  source        text check (length(source) <= 200),
  published_at  timestamptz,
  fetched_at    timestamptz not null default now()
);
alter table public.news enable row level security;
drop policy if exists "signed-in read" on public.news;
create policy "signed-in read" on public.news for select to authenticated using (true);
revoke all on public.news from anon;
grant select on public.news to authenticated;

-- Fetch new headlines every 3 hours.
select cron.schedule('agiza-news', '7 */3 * * *', $$
  select net.http_post(
    url := 'https://piksliczqbyoivngkzii.supabase.co/functions/v1/news',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_anon_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000)
$$);
