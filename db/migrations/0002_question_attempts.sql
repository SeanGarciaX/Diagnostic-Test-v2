-- Diagnostic-Test-v2 — unified Dashboard/Analytics attempt log
--
-- Adds ONE new table, `question_attempts`, plus a handful of read-only
-- aggregate functions. It does not touch the existing question table, and
-- does not touch any table from 0001_init.sql (`profiles`,
-- `practice_sessions`, `attempts`, `review_queue`) — those keep powering
-- the existing signed-in-only Progress page exactly as before.
--
-- Why a new table instead of reusing `attempts`: `attempts` (and its RLS
-- policies) hard-require a real `auth.uid()`, so it structurally can't
-- record anything for a guest. Sign-up is currently disabled, so *every*
-- visitor today is a guest — without this table, the Dashboard/Analytics
-- pages would have nothing to show at all. `question_attempts` accepts
-- either a signed-in `user_id` OR an anonymous `guest_id` (never both), so
-- the exact same table and the exact same query functions serve both a
-- guest today and a signed-in student later — no rebuild needed when
-- sign-up comes back. See src/lib/analytics.ts for the single write path
-- (`recordQuestionAttempt`) every question-answering flow calls into.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste
-- this whole file -> Run. (Run after 0001_init.sql.)

create table if not exists public.question_attempts (
  -- Generated client-side (crypto.randomUUID()) at the moment a student
  -- submits an answer, and used as the primary key on purpose: it's the
  -- idempotency key. A double-click, an accidental re-render, or a client
  -- retrying the same insert after a dropped response all resend the SAME
  -- id, so the primary-key uniqueness constraint rejects the duplicate
  -- and the app treats that as "already recorded" rather than erroring.
  -- A genuine retry of the QUESTION (answered again later) gets a fresh
  -- id, so it's correctly recorded as a second, separate attempt.
  id uuid primary key,

  -- Exactly one of these two is set — see question_attempts_owner below.
  -- guest_id is never treated as a secure identity: it's a value read from
  -- a browser cookie (src/lib/guestId.ts), good enough to group one
  -- browser's own practice history together, not good enough to prove who
  -- someone is. It intentionally never carries a display name or other
  -- personal info.
  user_id uuid references auth.users (id) on delete cascade,
  guest_id text,

  -- Client-generated per practice/full-test run, groups attempts from one
  -- sitting without requiring a `practice_sessions` row (which, like
  -- `attempts`, needs a real signed-in user).
  session_id text not null,
  source text not null check (source in ('quick_practice', 'spaced_review', 'full_test')),

  problem_id text not null,
  -- Domain/topic/difficulty are copied from the question bank at
  -- answer-time (same approach as `attempts`), so Dashboard/Analytics
  -- never need to join back to the question table. Nullable: if a
  -- question is ever missing this metadata, store what's real rather than
  -- invent a value.
  domain text,
  topic text,
  difficulty text,

  selected_answer text,
  correct_answer text,
  correct boolean not null,

  -- When the question actually became active for the student vs. when
  -- they submitted — see active_time_seconds for the derived, idle-aware
  -- duration actually used for timing metrics.
  started_at timestamptz not null,
  submitted_at timestamptz not null,
  active_time_seconds integer not null default 0,

  created_at timestamptz not null default now(),

  constraint question_attempts_owner check (
    (user_id is not null and guest_id is null) or (user_id is null and guest_id is not null)
  ),
  constraint question_attempts_submitted_after_started check (submitted_at >= started_at),
  constraint question_attempts_active_time_nonnegative check (active_time_seconds >= 0)
);

create index if not exists question_attempts_user_submitted_idx
  on public.question_attempts (user_id, submitted_at desc) where user_id is not null;
create index if not exists question_attempts_guest_submitted_idx
  on public.question_attempts (guest_id, submitted_at desc) where guest_id is not null;

alter table public.question_attempts enable row level security;

-- Authenticated students: identical trust model to `attempts` — a student
-- can only ever insert/read their own rows.
create policy "question_attempts: owner insert" on public.question_attempts
  for insert with check (guest_id is null and auth.uid() = user_id);
create policy "question_attempts: owner read" on public.question_attempts
  for select using (guest_id is null and auth.uid() = user_id);

-- Guests have no Supabase session at all, so there is no `auth.uid()` to
-- check against — RLS can only ever gate a guest row on "did the caller
-- send a guest_id", not "is this really that guest's browser" (there is
-- no server-side concept of "that guest's browser" without accounts).
-- Inserts are allowed broadly on that basis. Reads are NOT: a direct
-- `select` against this table is restricted to the owner-only policy
-- above (so an anon-key holder can never bulk-read every guest's rows at
-- once). All guest reads instead go through the SECURITY DEFINER
-- functions below, which require the caller to already know the specific
-- guest_id they're asking about and only ever return that one guest's
-- rows — the same practical exposure as the insert policy already allows,
-- with no open table scan possible. This is the documented limitation of
-- any no-login analytics: a guest_id is a bearer value, not proof of
-- identity, and none of this data is personally identifying (no name, no
-- email, no IP stored).
create policy "question_attempts: guest insert" on public.question_attempts
  for insert with check (guest_id is not null and user_id is null);

-- ---------------------------------------------------------------------
-- Aggregate read functions. Every one takes BOTH a p_user_id and a
-- p_guest_id (exactly one is ever passed) so Dashboard/Analytics call the
-- exact same functions for a guest today and a signed-in student later.
-- SECURITY DEFINER so they can read across the guest partition (RLS above
-- blocks direct guest selects); each one filters strictly by the id
-- actually passed in, so it never exposes more than that one caller's own
-- rows. Grant execute to anon (guests never authenticate) and
-- authenticated.
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
    coalesce(sum(case when correct then 1 else 0 end), 0)::integer,
    count(distinct problem_id)::integer,
    coalesce(sum(active_time_seconds), 0)::bigint,
    min(submitted_at)
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
    (submitted_at at time zone 'utc')::date as day,
    count(*)::integer,
    coalesce(sum(case when correct then 1 else 0 end), 0)::integer,
    coalesce(sum(active_time_seconds), 0)::bigint
  from public.question_attempts
  where ((p_user_id is not null and user_id = p_user_id)
      or (p_guest_id is not null and guest_id = p_guest_id))
    and submitted_at >= (now() - (greatest(p_days, 1) || ' days')::interval)
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
    coalesce(sum(case when correct then 1 else 0 end), 0)::integer,
    round(avg(nullif(active_time_seconds, 0)), 1)
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
    coalesce(sum(case when correct then 1 else 0 end), 0)::integer
  from public.question_attempts
  where (p_user_id is not null and user_id = p_user_id)
     or (p_guest_id is not null and guest_id = p_guest_id)
  group by 1;
$$;

create or replace function public.question_attempts_recent(p_user_id uuid, p_guest_id text, p_limit integer default 30)
returns table (
  id uuid,
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
  select id, problem_id, domain, topic, difficulty, source, correct, submitted_at, active_time_seconds
  from public.question_attempts
  where (p_user_id is not null and user_id = p_user_id)
     or (p_guest_id is not null and guest_id = p_guest_id)
  order by submitted_at desc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.question_attempts_totals(uuid, text) to anon, authenticated;
grant execute on function public.question_attempts_daily(uuid, text, integer) to anon, authenticated;
grant execute on function public.question_attempts_domain_summary(uuid, text) to anon, authenticated;
grant execute on function public.question_attempts_difficulty_summary(uuid, text) to anon, authenticated;
grant execute on function public.question_attempts_recent(uuid, text, integer) to anon, authenticated;
