-- Diagnostic-Test-v2 — fixes a likely cause of "completed questions but
-- nothing showed up in question_attempts": RLS policies only control WHICH
-- rows a role can touch, not WHETHER it can touch the table at all — that
-- second part is a separate, plain SQL privilege grant. If
-- `public.question_attempts` was created by hand in the SQL Editor (rather
-- than through Supabase's Table Editor UI, which grants this
-- automatically), `anon`/`authenticated` have zero privileges on it by
-- default, and every insert fails with "permission denied for table
-- question_attempts" — silently, from the student's point of view, since
-- src/lib/analytics.ts logs that error to the console rather than
-- interrupting the test. This should have been part of
-- 0003_question_attempts_guest_schema.sql; added here as its own small,
-- fast-to-run file so it doesn't need to be tracked down inside the longer
-- one. Safe to run more than once.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste
-- this whole file -> Run.

grant usage on schema public to anon, authenticated;
grant select, insert on public.question_attempts to anon, authenticated;
