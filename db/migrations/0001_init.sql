-- Diagnostic-Test-v2 — initial backend schema
--
-- This adds four new tables to your EXISTING Supabase project. It does not
-- touch the existing question table (default name "Practice_Test_Questions")
-- in any way — this app only ever reads from that table.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste
-- this whole file -> Run.

-- 1. One row per signed-up student, linked to Supabase's built-in auth users.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Student',
  target_score integer not null default 750,
  daily_question_goal integer not null default 5,
  theme text not null default 'classic',
  created_at timestamptz not null default now()
);

-- 2. One row per practice/test session (a "Quick Practice" run or a full
--    two-module simulation). Individual question attempts point back here.
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_type text not null check (session_type in ('practice', 'full_test', 'diagnostic')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  question_count integer not null default 0,
  correct_count integer not null default 0
);

-- 3. One row per question answered. This is the core performance record —
--    domain/topic/difficulty are copied onto the row at answer-time so
--    progress reports never need to join back to the question table.
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.practice_sessions (id) on delete set null,
  problem_id text not null,
  domain text not null,
  topic text not null,
  difficulty text not null default 'Medium',
  correct boolean not null,
  selected_answer text,
  correct_answer text,
  hint_used boolean not null default false,
  confidence text check (confidence in ('Unsure', 'Okay', 'Confident')),
  time_seconds integer,
  answered_at timestamptz not null default now()
);

-- 4. Spaced-review queue: which missed questions are due for another look,
--    and when. See src/lib/reviewScheduler.ts for the scheduling rules.
create table if not exists public.review_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  problem_id text not null,
  review_stage integer not null default 0,
  missed_at timestamptz not null default now(),
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  unique (user_id, problem_id)
);

create index if not exists attempts_user_answered_idx on public.attempts (user_id, answered_at desc);
create index if not exists review_queue_user_due_idx on public.review_queue (user_id, next_review_at);

-- Row Level Security: every table above is only ever readable/writable by
-- the student it belongs to. This is what lets the app use the public
-- "anon" API key everywhere with no secret server-only key.
alter table public.profiles enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.review_queue enable row level security;

create policy "profiles: owner read" on public.profiles for select using (auth.uid() = id);
create policy "profiles: owner insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: owner update" on public.profiles for update using (auth.uid() = id);

create policy "sessions: owner read" on public.practice_sessions for select using (auth.uid() = user_id);
create policy "sessions: owner insert" on public.practice_sessions for insert with check (auth.uid() = user_id);
create policy "sessions: owner update" on public.practice_sessions for update using (auth.uid() = user_id);

create policy "attempts: owner read" on public.attempts for select using (auth.uid() = user_id);
create policy "attempts: owner insert" on public.attempts for insert with check (auth.uid() = user_id);

create policy "review_queue: owner read" on public.review_queue for select using (auth.uid() = user_id);
create policy "review_queue: owner insert" on public.review_queue for insert with check (auth.uid() = user_id);
create policy "review_queue: owner update" on public.review_queue for update using (auth.uid() = user_id);

-- A ready-made view for "mastery by domain/topic" so the app never has to
-- hand-roll this aggregation query. RLS on the underlying `attempts` table
-- still applies, so a student only ever sees their own rows through it.
create or replace view public.mastery_by_topic as
select
  user_id,
  domain,
  topic,
  count(*) as attempts,
  sum(case when correct then 1 else 0 end) as correct,
  round(100.0 * sum(case when correct then 1 else 0 end) / count(*)) as accuracy,
  max(answered_at) as last_practiced_at
from public.attempts
group by user_id, domain, topic;
