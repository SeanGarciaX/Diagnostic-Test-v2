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
> all work; nothing is saved (no progress, no mastery history) until
> that's fixed. `/sign-in` and `/sign-up` still work if you go to them
> directly. See `src/lib/viewer.ts` and `src/app/page.tsx` for exactly
> what changed and how to flip it back once sign-up is working.

## What this app does

- **Sign up / sign in** with a real account (email + password).
- **Quick Practice** — answer real SAT Math questions one at a time, with a
  confidence check and a full step-by-step solution afterward.
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
- **Dashboard & Progress** — a mastery score per topic, accuracy, streaks,
  and an "Orbit Coach" recommendation for what to practice next, all
  computed from your real answer history in the database.
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
    attempts.ts / profile.ts   read & write the database tables
    supabase/               the three ways we talk to Supabase (browser,
                              server, and the session-refresh middleware)
    exam/                     Full Test-specific logic (the defensive
                                math-rendering fallback layer)
db/
  migrations/0001_init.sql  the database schema — run this once, see below
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

This adds four new tables (`profiles`, `practice_sessions`, `attempts`,
`review_queue`) alongside your existing question table. It does not modify
or touch the existing question table in any way.

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
