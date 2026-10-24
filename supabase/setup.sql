-- Agiza Office: database setup for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.
-- Safe to run again: it only creates what is missing.
--
-- Security model: every row has an owner (the signed-in user). Row Level Security
-- lets a user see and change only their own rows. Sign-ups are switched off in
-- Supabase, so Agiza's account is the only one that can sign in at all.

create extension if not exists pgcrypto;

-- ---------- Clients ----------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(name) between 1 and 120),
  phone       text check (length(phone) <= 30),
  plan        text check (length(plan) <= 120),
  status      text not null default 'new' check (status in ('new', 'quote', 'docs', 'done')),
  note        text check (length(note) <= 1000),
  covered_on  date,
  created_at  timestamptz not null default now()
);

-- ---------- Meetings ----------
create table if not exists public.meetings (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (length(title) between 1 and 120),
  starts_at     timestamptz not null,
  duration_min  int not null default 30 check (duration_min between 5 and 600),
  place         text check (length(place) <= 160),
  kind          text not null default 'new' check (kind in ('new', 'quote', 'docs', 'office', 'event')),
  note          text check (length(note) <= 1000),
  created_at    timestamptz not null default now()
);

-- ---------- Quotes ----------
create table if not exists public.quotes (
  id               uuid primary key default gen_random_uuid(),
  owner            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_name      text not null check (length(client_name) between 1 and 120),
  plan             text check (length(plan) <= 120),
  sum_assured      numeric(14, 2) check (sum_assured >= 0),
  premium_monthly  numeric(12, 2) check (premium_monthly >= 0),
  sent_on          date not null default current_date,
  status           text not null default 'waiting' check (status in ('waiting', 'follow', 'accepted', 'declined')),
  next_step        text check (length(next_step) <= 160),
  pdf_path         text,
  created_at       timestamptz not null default now()
);

-- ---------- To-dos ----------
create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text        text not null check (length(text) between 1 and 200),
  due         date,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- Row Level Security: owner only ----------
do $$
declare t text;
begin
  foreach t in array array['clients', 'meetings', 'quotes', 'todos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner only" on public.%I', t);
    execute format(
      'create policy "owner only" on public.%I for all to authenticated
         using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner)', t);
    execute format('create index if not exists %I on public.%I (owner)', t || '_owner_idx', t);
  end loop;
end $$;

-- Anonymous visitors get nothing at all.
revoke all on public.clients, public.meetings, public.quotes, public.todos from anon;
-- Signed-in users may use the tables; the "owner only" rule above limits them to their own rows.
-- (Newer Supabase projects no longer grant this automatically.)
grant select, insert, update, delete on public.clients, public.meetings, public.quotes, public.todos to authenticated;

-- ---------- Private storage for quote PDFs ----------
-- Files live under quotes/<her user id>/..., and only she can read or write her folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quotes', 'quotes', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "quotes: owner folder" on storage.objects;
create policy "quotes: owner folder" on storage.objects for all to authenticated
  using (bucket_id = 'quotes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'quotes' and (storage.foldername(name))[1] = (select auth.uid())::text);
