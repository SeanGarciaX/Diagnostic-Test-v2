# What changed, and why

This app replaces two earlier prototypes. Neither is modified — both stay
exactly as they were. This document explains what this repo kept, cut, or
rebuilt from each, and the reasoning behind it.

## From Orbit-SAT, kept

- **The mastery-scoring formula** (`src/lib/mastery.ts`) — blends accuracy,
  hint-independence, confidence calibration, pace, and recent retention
  into one score, instead of just accuracy. Same math as the original,
  rewritten from dense one-line functions into readable, commented code.
- **The "what to practice next" recommendation engine**
  (`src/lib/adaptive.ts`) — ranks skills by how *uncertain* we are the
  student has mastered them, not just by raw accuracy.
- **Spaced review** (`src/lib/reviewScheduler.ts`) — the same 1/3/7/14-day
  cadence for resurfacing missed questions.
- **The three clean color themes** (`src/lib/theme.ts`) — Classic, Coastal,
  and Graphite.

## From Orbit-SAT, cut

- **The synthetic question generator.** Orbit-SAT's questions were
  procedurally generated from ~12 arithmetic templates — not real SAT
  content. This app uses the real, curated question bank instead (see
  below), which is the single biggest functional upgrade over both
  originals.
- **The dozen movie/game-licensed theme packs** (Spider-Man, Batman, Harry
  Potter, etc.) and their background images. They were already disabled in
  the source app and added real weight to the repo for no active benefit.
  The three clean palettes cover the actual theming feature.
- **Fake local-only accounts.** Orbit-SAT's "sign in with Google/Apple" was
  a demo that didn't actually authenticate anyone, and all data lived in
  one browser's `localStorage` — wiped by clearing site data, invisible to
  anyone else. Replaced with real Supabase accounts and a real database.

## From Diagnostic-Test, kept

- **The real question bank and step-by-step solutions**, read directly
  from the same Supabase table (`src/lib/questions.ts`). This is real,
  curated SAT content with concept/strategy/step explanations — a large
  step up from generated arithmetic.
- **The math-text cleanup pipeline** (`src/lib/mathText.ts`) — turning raw
  stored text into something MathJax renders correctly (fractions,
  exponents, symbols). Simplified from the original's much larger regex
  pipeline, covering the common cases in code that's easy to extend.
- **The timed-test experience** (`src/components/ExamSimulation.tsx`) — a
  question navigator, flagging, and review-before-submit, modeled on the
  original's authentic exam feel.

## From Diagnostic-Test, cut or rebuilt

- **The Streamlit + embedded-iframe architecture**, entirely. The original
  app worked by generating one enormous (1,400+ line) string of HTML/CSS/
  JavaScript and handing it to Streamlit's `components.html`. That's why
  it couldn't have real components, a shared design system, or tests. This
  app is plain Next.js/React components instead — same core UI ideas
  (timer, navigator, flagging, review), built as normal, readable code.
- **The hardcoded single student ("Sean Garcia") and fixed test.** Every
  student now gets a real account and their own questions/results.
- **No persistence, anywhere.** The original never wrote a result back to
  the database — a score vanished on refresh. This app's entire reason for
  existing is fixing that: every attempt is saved to `attempts`, every
  session to `practice_sessions`.

## What's new here, not carried over from either original

- **Real accounts and a real backend.** Supabase Auth (email + password)
  plus four new database tables (`profiles`, `practice_sessions`,
  `attempts`, `review_queue`), all protected by Row Level Security so a
  student can only ever see their own data — see
  `db/migrations/0001_init.sql`.
- **One shared design system** (`src/app/globals.css` + `src/lib/theme.ts`)
  used by every page, instead of Orbit-SAT's per-component inline styling
  or Diagnostic-Test's giant hand-tuned CSS string.
- **A test suite** (`npm run test`) covering the mastery formula, the
  review scheduler, and the math-text cleanup — none of the pure scoring
  logic in either original had automated tests.
