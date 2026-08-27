-- Diagnostic-Test-v2 — defensive fix for a plausible remaining cause of
-- "writes might work but Dashboard/Analytics show nothing": the read
-- functions compare `guest_id = p_guest_id` where `guest_id` is whatever
-- type the table's real column actually is and `p_guest_id` is declared
-- `text`. If the real column is `uuid` (a very reasonable choice if this
-- table was created by hand, since the app's guest ids ARE UUIDs),
-- Postgres does NOT implicitly compare `uuid = text` — every one of these
-- functions would fail outright with "operator does not exist: uuid =
-- text" any time a guest_id is passed in, even though the RPC itself is
-- reachable and correctly granted.
--
-- Casting the column to text explicitly makes the comparison work
-- regardless of whether the real column is `text` or `uuid`. This is safe
-- to run whether or not your column actually has this problem. Safe to
-- run more than once.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste
-- this whole file -> Run.

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
     or (p_guest_id is not null and guest_id::text = p_guest_id);
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
      or (p_guest_id is not null and guest_id::text = p_guest_id))
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
     or (p_guest_id is not null and guest_id::text = p_guest_id)
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
     or (p_guest_id is not null and guest_id::text = p_guest_id)
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
     or (p_guest_id is not null and guest_id::text = p_guest_id)
  order by completed_at desc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.question_attempts_totals(uuid, text) to anon, authenticated;
grant execute on function public.question_attempts_daily(uuid, text, integer) to anon, authenticated;
grant execute on function public.question_attempts_domain_summary(uuid, text) to anon, authenticated;
grant execute on function public.question_attempts_difficulty_summary(uuid, text) to anon, authenticated;
grant execute on function public.question_attempts_recent(uuid, text, integer) to anon, authenticated;
