# Orbit SAT Math (Diagnostic-Test-v2)

An adaptive SAT Math practice site: real questions, real student accounts,
and progress that's actually saved. This repo replaces two earlier
prototypes — **Orbit-SAT** (a Next.js app with an adaptive learning engine
but fake, generated questions and no login) and **Diagnostic-Test** (a
Streamlit app with real questions and a polished exam UI, but no accounts
and nothing saved). This app keeps what worked from each and drops the
rest — see [`docs/what-changed.md`](docs/what-changed.md) for the reasoning
behind every major decision.

> **Temporary:** account creation is currently disabled as the front door
> while a sign-up bug is being tracked down. Every visitor lands directly
> in the app as a **guest** — real questions, practice, and the full test
> all work; the older per-account mastery/spaced-review history (`attempts`,
> `practice_sessions`, `review_queue`) isn't saved until that's fixed.
> Settings (display name, target score, daily goal, theme) **are** saved
> for guests, but only in a cookie on that one device/browser — see
> `src/lib/guestSettings.ts` — not tied to any account. **Dashboard/
> Analytics performance tracking works for guests too** (see below) — it's
> a separate, newer system built specifically so it didn't need accounts to
> work. `/sign-in` and `/sign-up` still work if you go to them directly. See
> `src/lib/viewer.ts` and `src/app/page.tsx` for exactly what changed and
> how to flip it back once sign-up is working.

## What this app does

- **Sign up / sign in** with a real account (email + password).
- **Quick Practice** — answer real SAT Math questions one at a time, with a
  confidence check, a sound effect for a correct/incorrect answer and for
  finishing the session (`src/lib/sounds.ts`, assets in `public/sounds/`),
  and a full step-by-step solution afterward.
- **Full Test** — a faithful rebuild of the original Diagnostic-Test app's
  exam experience: pick a difficulty bank and timing accommodation, then a
  timed 22-question run with a draggable/resizable Desmos calculator, a
  reference sheet, official-style directions, mark-for-review flagging,
  per-choice "cross out," a question navigator, dark mode, a finish-screen
  celebration animation, and a full step-by-step solution review (with
  auto-generated geometry diagrams) afterward — see
  `src/components/exam/FullTestExam.tsx`.
- **Spaced review** — missed questions come back at 1, 3, 7, and 14-day
  intervals until you've got them down.
- **Dashboard & Advanced Analytics** — problems completed, accuracy,
  time spent, a daily practice streak, a "Today's Mission" goal tracker,
  and a full SAT Math domain breakdown (accuracy, volume, and speed per
  domain, plus difficulty and trend charts) — all computed from real
  submitted-answer history, **for guests and signed-in students alike**.
  See [Guest-friendly performance tracking](#guest-friendly-performance-tracking)
  below for how that works without an account.
- **Progress** — a mastery score per topic, accuracy, streaks, computed
  from your real answer history (signed-in students only, for now).
- **Settings** — pick one of three color themes, set a target score and
  daily question goal.

Everything above is saved to a real database (Supabase/Postgres), tied to
your account — not to one browser's local storage.

## How the code is organized

```
src/
  app/            One folder per page (Next.js "App Router").
                   e.g. src/app/dashboard/page.tsx is the /dashboard page.
  components/     Reusable pieces of UI (a question card, the nav sidebar…).
    exam/               everything specific to the Full Test experience
                          (FullTestExam.tsx is the main one — start there)
  lib/            All the "thinking" — no UI code in here at all:
    questions.ts        loads & cleans up real questions from Supabase
    mathText.ts          turns raw text into math MathJax can render
    mastery.ts            the mastery-score formula
    adaptive.ts            picks what to recommend practicing next
    reviewScheduler.ts     the 1/3/7/14-day spaced-review timing
    attempts.ts / profile.ts   read & write the OLDER signed-in-only tables
    analytics.ts             the ONE write path for Dashboard/Analytics —
                               every question-answering flow calls
                               recordQuestionAttempt() from here
    dashboardData.ts            reads the Dashboard/Analytics aggregate data
    guestId.ts / activeTime.ts    the guest identifier cookie, and the
                                    idle-aware active-time tracker
    supabase/               the three ways we talk to Supabase (browser,
                              server, and the session-refresh middleware)
    exam/                     Full Test-specific logic (the defensive
                                math-rendering fallback layer)
db/
  migrations/0001_init.sql  the OLDER, signed-in-only schema — run once
  migrations/0002_question_attempts.sql  an early draft of the
                                           Dashboard/Analytics schema —
                                           superseded by 0003, kept for
                                           history, do not run
  migrations/0003_question_attempts_guest_schema.sql  adapts the app to the
                                                         `question_attempts`
                                                         table as it's
                                                         actually set up in
                                                         Supabase — run once
```

Every page under `src/app/` follows the same shape: it's a small Server
Component that loads data (via functions in `src/lib/`) and hands it to a
`NavShell` plus one or two components. If you're new to this codebase, the
fastest way to understand a page is to open `src/app/<page>/page.tsx` first
— it reads almost like a checklist of what that page needs.

## One-time setup

You need two things: a Supabase project (this app reuses the **same**
Supabase project the original Diagnostic-Test app used, so the real
question bank is already there) and Node.js installed locally.

### 1. Run the database migration

1. Open your Supabase project's dashboard → **SQL Editor** → **New query**.
2. Paste in the entire contents of [`db/migrations/0001_init.sql`](db/migrations/0001_init.sql).
3. Click **Run**.
4. Repeat with [`db/migrations/0003_question_attempts_guest_schema.sql`](db/migrations/0003_question_attempts_guest_schema.sql)
   (skip `0002` — it's superseded, see the file layout above).

The first migration adds four tables (`profiles`, `practice_sessions`,
`attempts`, `review_queue`) that only work for signed-in students. The
third adapts `question_attempts` (every column, the unique index, RLS
policies, and a handful of read-only SQL functions) to work with a table
either created from this file directly or already set up by hand in
Supabase — this is what powers Dashboard/Advanced Analytics, and it's the
one that also works for guests (no sign-in needed). Every statement in it
is safe to run more than once. No migration here modifies or touches the
existing question table in any way.

### 2. Configure your environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` — both are in your Supabase dashboard under
**Project Settings → API**. These are safe to use in a browser-facing app;
every table they can touch is locked down with Row Level Security (see the
migration file), so a signed-in student can only ever read or write their
own rows.

### 3. Enable email sign-up in Supabase

In the Supabase dashboard: **Authentication → Providers → Email**, make
sure it's enabled. (It is by default on a new project.) If you don't want
Supabase's confirmation emails while testing, you can turn off "Confirm
email" under **Authentication → Settings**.

### 4. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, create an account, and you're in.

## Guest-friendly performance tracking

Dashboard and Advanced Analytics are built on a separate, newer system from
the rest of the app (`question_attempts` — see
`db/migrations/0003_question_attempts_guest_schema.sql`), specifically so
it works for a guest, not just a signed-in student:

- **One write path.** Every question-answering flow — Quick Practice,
  Spaced Review, and the Full Test — calls the same
  `recordQuestionAttempt()` (`src/lib/analytics.ts`). A new mode should call
  it too, rather than inventing its own tracking.
- **Guest identity is a cookie, not an account.** `src/lib/guestId.ts` sets
  a long-lived, random id the first time a guest submits an answer — the
  same one every time on that browser, until the cookie is cleared. It's
  read server-side for Dashboard/Analytics and client-side for recording.
  It's a browser identifier, not a person: a new browser, private window,
  or cleared cookie starts a fresh history. A signed-in student's real
  `user_id` is used instead and never mixes with a guest id — see the
  ownership check in the migration — so guest history doesn't automatically
  carry over to an account today, but the schema is shaped so that could be
  added later without a rebuild.
- **One submission = one attempt, on purpose.** `attempt_event_id` is
  generated client-side at submit time and is written under a unique index
  (see the migration), so a double-click, a re-render, or a retried request
  all resend the SAME id and the repeat write is silently ignored rather
  than becoming a second row. Answering the same question again later (e.g.
  spaced review resurfacing it) gets a fresh id, so it's correctly counted
  as a second, real attempt.
- **"Active time," not wall-clock time.** `src/lib/activeTime.ts` excludes
  time while the tab isn't visible/focused, and time beyond 90 seconds of
  no mouse/keyboard/scroll/touch activity while it is — a heuristic
  estimate of time actually spent on the question, documented in that
  file.
- **Aggregation happens in Postgres**, not the browser: Dashboard/Analytics
  call a handful of `SECURITY DEFINER` SQL functions
  (`question_attempts_totals`, `_daily`, `_domain_summary`, etc.) that
  return small, pre-aggregated result sets, so page load time doesn't grow
  with how much history a student has.

## Everyday commands

```bash
npm run dev         # start the app locally
npm run test         # run the automated tests for the scoring/scheduling logic
npm run typecheck     # check for type errors
npm run build           # production build
npm run check             # all of the above, in order — run this before pushing changes
```

## What's intentionally not built yet

To keep this first version simple and reliable, a few things from the
earlier prototypes were left out rather than half-built:

- A dedicated multi-question adaptive diagnostic flow (the dashboard's
  "Orbit Coach" recommendation already adapts to your history, just not
  through its own guided quiz yet).
- Teacher/parent-facing views of a student's results (the database is
  already structured to support this — it would mean adding a new page
  that queries `attempts` for a chosen student).

## Where the content and design choices came from

See [`docs/what-changed.md`](docs/what-changed.md) for a full writeup of
what was kept, cut, or rebuilt from each of the two original repos, and why.
