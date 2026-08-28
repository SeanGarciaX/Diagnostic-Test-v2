-- Diagnostic-Test-v2 — adapts the app to the `public.question_attempts`
-- table as it actually exists in Supabase today (created directly in the
-- dashboard, not from 0002_question_attempts.sql — the column names differ:
-- attempt_event_id/question_id/practice_mode/source_name/is_correct/
-- completed_at/time_spent_seconds/completion_date instead of the earlier
-- id/problem_id/source/correct/submitted_at/active_time_seconds).
--
-- This migration does NOT recreate the table (it already exists) — it only
-- (a) makes sure every column the app writes to is actually present,
-- (b) adds the unique index the app's idempotency strategy depends on, and
-- (c) (re)creates RLS policies and read functions against the real column
-- names. Every statement is safe to run more than once.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste
-- this whole file -> Run. If your table already has some of these columns
-- under different names or types, adjust the `add column` lines below to
-- match before running — the app expects exactly the names/types here.

alter table public.question_attempts add column if not exists guest_id text;
alter table public.question_attempts add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.question_attempts add column if not exists session_id text;
-- Idempotency key — see src/lib/analytics.ts. Generated client-side once
-- per submission; the unique index below is what turns a double-click or a
-- retried request into a no-op instead of a second row.
alter table public.question_attempts add column if not exists attempt_event_id text;
alter table public.question_attempts add column if not exists question_id text;
alter table public.question_attempts add column if not exists domain text;
alter table public.question_attempts add column if not exists topic text;
alter table public.question_attempts add column if not exists difficulty text;
-- practice_mode: a fixed small set of values (quick_practice/spaced_review/
-- full_test) the app filters/groups on. source_name: a human-readable label
-- for the same thing ("Quick Practice", "Spaced Review", "Full Test"),
-- kept separate so the UI never has to prettify the machine value.
alter table public.question_attempts add column if not exists practice_mode text;
alter table public.question_attempts add column if not exists source_name text;
alter table public.question_attempts add column if not exists selected_answer text;
alter table public.question_attempts add column if not exists correct_answer text;
alter table public.question_attempts add column if not exists is_correct boolean;
alter table public.question_attempts add column if not exists started_at timestamptz;
alter table public.question_attempts add column if not exists completed_at timestamptz;
alter table public.question_attempts add column if not exists time_spent_seconds integer;
-- Plain date (not timestamptz) so day-bucketed queries never have to
-- re-derive "which day" from a timestamp inside every aggregate query.
-- NOTE: on the table as actually created for this project, this column
-- turned out to be `generated always as (completed_at::date) stored` —
-- i.e. Postgres computes it, and rejects any explicit value the app tries
-- to write (error code 428C9). src/lib/analytics.ts does NOT include this
-- field in its insert payload for exactly that reason. This `add column
-- if not exists` is a no-op against that table (the column already
-- exists) — it's here only so a from-scratch setup still gets a plain,
-- writable date column with the same name and purpose.
alter table public.question_attempts add column if not exists completion_date date;
alter table public.question_attempts add column if not exists created_at timestamptz not null default now();

-- RLS policies (below) control WHICH rows a role can touch; they don't grant
-- access to the table at all — that's a separate, plain SQL privilege. If
-- this table was created by hand in the SQL Editor (not through the Table
-- Editor UI, which grants this automatically), anon/authenticated have zero
-- privileges on it by default and every insert fails with "permission
-- denied for table question_attempts" regardless of how correct the RLS
-- policies are. See db/migrations/0004_question_attempts_grants.sql.
grant usage on schema public to anon, authenticated;
grant select, insert on public.question_attempts to anon, authenticated;

create unique index if not exists question_attempts_attempt_event_id_key on public.question_attempts (attempt_event_id);
create index if not exists question_attempts_guest_completed_idx on public.question_attempts (guest_id, completed_at desc) where guest_id is not null;
create index if not exists question_attempts_user_completed_idx on public.question_attempts (user_id, completed_at desc) where user_id is not null;

alter table public.question_attempts enable row level security;

-- Recreated defensively (DO blocks so re-running this file is safe even if
-- a same-named policy already exists from an earlier manual setup).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'question_attempts' and policyname = 'question_attempts: owner insert') then
    create policy "question_attempts: owner insert" on public.question_attempts
      for insert with check (guest_id is null and auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'question_attempts' and policyname = 'question_attempts: owner read') then
    create policy "question_attempts: owner read" on public.question_attempts
      for select using (guest_id is null and auth.uid() = user_id);
  end if;

  -- Guests have no Supabase session, so there's no auth.uid() to check
  -- against — this is the same documented trade-off as before: anyone
  -- holding the anon key can INSERT a guest row (no PII stored in one), but
  -- direct SELECT stays owner-only (below); guest reads only ever go
  -- through the SECURITY DEFINER functions further down, which require
  -- already knowing the specific guest_id being asked about.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'question_attempts' and policyname = 'question_attempts: guest insert') then
    create policy "question_attempts: guest insert" on public.question_attempts
      for insert with check (guest_id is not null and user_id is null);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Aggregate read functions used by Dashboard/Analytics
-- (src/lib/dashboardData.ts). Same names/return shapes as before — only
-- the SQL body changed, to read the real column names above. CREATE OR
-- REPLACE, so safe to rerun.
-- ---------------------------------------------------------------------

create or replace function public.question_attempts_totals(p_user_id uuid, p_guest_id text)
returns table (
  total_attempts integer,
  total_correct integer,
  total_unique_questions integer,
  total_active_seconds bigint,
  first_attempt_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer,
    count(distinct question_id)::integer,
    coalesce(sum(time_spent_seconds), 0)::bigint,
    min(completed_at)
  from public.question_attempts
  where (p_user_id is not null and user_id = p_user_id)
     or (p_guest_id is not null and guest_id = p_guest_id);
$$;

create or replace function public.question_attempts_daily(p_user_id uuid, p_guest_id text, p_days integer default 35)
returns table (
  day date,
  attempts integer,
  correct integer,
  active_seconds bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(completion_date, (completed_at at time zone 'utc')::date) as day,
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer,
    coalesce(sum(time_spent_seconds), 0)::bigint
  from public.question_attempts
  where ((p_user_id is not null and user_id = p_user_id)
      or (p_guest_id is not null and guest_id = p_guest_id))
    and completed_at >= (now() - (greatest(p_days, 1) || ' days')::interval)
  group by 1
  order by 1;
$$;

create or replace function public.question_attempts_domain_summary(p_user_id uuid, p_guest_id text)
returns table (
  domain text,
  attempts integer,
  correct integer,
  avg_active_seconds numeric
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(domain, 'Unknown'),
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer,
    round(avg(nullif(time_spent_seconds, 0)), 1)
  from public.question_attempts
  where (p_user_id is not null and user_id = p_user_id)
     or (p_guest_id is not null and guest_id = p_guest_id)
  group by 1;
$$;

create or replace function public.question_attempts_difficulty_summary(p_user_id uuid, p_guest_id text)
returns table (
  difficulty text,
  attempts integer,
  correct integer
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(difficulty, 'Unknown'),
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer
  from public.question_attempts
  where (p_user_id is not null and user_id = p_user_id)
     or (p_guest_id is not null and guest_id = p_guest_id)
  group by 1;
$$;

create or replace function public.question_attempts_recent(p_user_id uuid, p_guest_id text, p_limit integer default 30)
returns table (
  id text,
  problem_id text,
  domain text,
  topic text,
  difficulty text,
  source text,
  correct boolean,
  submitted_at timestamptz,
  active_time_seconds integer
)
language sql
security definer
set search_path = public
as $$
  select attempt_event_id, question_id, domain, topic, difficulty, practice_mode, is_correct, completed_at, time_spent_seconds
  from public.question_attempts
  where (p_user_id is not null and user_id = p_user_id)
     or (p_guest_id is not null and guest_id = p_guest_id)
  order by completed_at desc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.question_attempts_totals(uuid, text) to anon, authenticated;
grant execute on function public.question_attempts_daily(uuid, text, integer) to anon, authenticated;
grant execute on function public.question_attempts_domain_summary(uuid, text) to anon, authenticated;
grant execute on function public.question_attempts_difficulty_summary(uuid, text) to anon, authenticated;
grant execute on function public.question_attempts_recent(uuid, text, integer) to anon, authenticated;
