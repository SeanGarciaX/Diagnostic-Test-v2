// The ONE write path every question-answering flow in the app calls into
// to record a submitted answer for Dashboard/Analytics — writes to the
// `question_attempts` table (schema: db/migrations/0003_question_attempts_guest_schema.sql,
// adapting to the table as created directly in Supabase). Today that's
// src/components/PracticeSession.tsx (Quick Practice + Spaced Review) and
// src/components/exam/FullTestExam.tsx (Full Test) — any new
// question-solving mode should call this same function rather than
// inventing its own tracking.
//
// This is intentionally separate from src/lib/attempts.ts, which reads and
// writes the older, signed-in-only `attempts` table that still powers the
// Progress page's mastery/spaced-review engine. Both can run side by side
// for a signed-in student (attempts.ts is untouched); this file is what
// makes tracking work for a guest at all, since `attempts` structurally
// can't accept a row with no `auth.uid()`.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAnswerCorrect } from "./questions";
import type { Question } from "./types";

export type AttemptSource = "quick_practice" | "spaced_review" | "full_test";

const SOURCE_NAME: Record<AttemptSource, string> = {
  quick_practice: "Quick Practice",
  spaced_review: "Spaced Review",
  full_test: "Full Test"
};

export type QuestionAttemptInput = {
  /** Client-generated (crypto.randomUUID()) once per submission — the idempotency key, written to question_attempts.attempt_event_id (a separate column from the table's own `id`, which the database generates). */
  attemptEventId: string;
  userId: string | null;
  guestId: string | null;
  /** Groups attempts from one practice/full-test sitting. Client-generated, not a foreign key. */
  sessionId: string;
  practiceMode: AttemptSource;
  question: Question;
  /** Whatever the student picked: a choice index for multiple choice, typed text for student-response. `undefined` means "no answer" — the attempt is rejected, not recorded, since opening/viewing a question doesn't count as completing it. */
  selectedResponse: number | string | undefined;
  /** ms epoch — when this question actually became active for the student. */
  startedAt: number;
  /** ms epoch — defaults to now. */
  completedAt?: number;
  /** Active-time estimate in seconds, from useActiveTimeTracker (src/lib/activeTime.ts) — already idle/visibility-adjusted, not raw elapsed time. */
  activeSeconds: number;
};

export type RecordAttemptResult = { ok: true } | { ok: false; reason: string };

// Postgres/PostgREST error codes worth naming specifically, so a failed
// write points straight at the fix instead of a generic "insert failed."
// (docs: https://www.postgresql.org/docs/current/errcodes-appendix.html)
const KNOWN_ERROR_HINTS: Record<string, string> = {
  "42P10":
    "question_attempts.attempt_event_id has no unique index — duplicate protection is not active. Run db/migrations/0003_question_attempts_guest_schema.sql (or 0005 if 0003 is already applied).",
  "42501":
    "permission denied on question_attempts — the anon/authenticated role likely has no GRANT on this table (separate from RLS policies). Run db/migrations/0004_question_attempts_grants.sql.",
  "42703": "a column this app writes to doesn't exist on question_attempts — the table's real schema doesn't match what's expected. Compare against db/migrations/0003_question_attempts_guest_schema.sql's `add column` list.",
  "42P01": '"question_attempts" table not found — check it exists in the public schema of the connected Supabase project (right URL/key?).',
  "23502": "a NOT NULL column on question_attempts wasn't included in this write — check which column the error names and either allow it to be null or make sure the app populates it.",
  "23514": "a CHECK constraint on question_attempts rejected this row — likely domain/topic/difficulty/practice_mode doesn't match an allowed value/enum on that column. Check the error's constraint name in Supabase.",
  "22P02": "a value didn't match its column's type (e.g. a column expecting a UUID or enum got a plain string) — check the error detail for which column.",
  "23503": "a foreign key on question_attempts was violated — most likely user_id referencing auth.users with a value that doesn't exist (shouldn't happen for a guest row, where user_id is always null)."
};

function describeError(error: { code?: string; message: string }): string {
  const hint = error.code ? KNOWN_ERROR_HINTS[error.code] : undefined;
  return hint ? `${hint} (Postgres code ${error.code}: ${error.message})` : `${error.message}${error.code ? ` (Postgres code ${error.code})` : ""}`;
}

/**
 * Validates and records one submitted answer. Never throws — a malformed
 * or failed write is logged (with enough context to identify the question
 * and guest/user) and reported back as `{ ok: false }` so a broken
 * analytics call can never take down the question-answering UI it's
 * attached to, and a failed insert is never reported as a success. Safe to
 * call for both a guest and a signed-in student: pass exactly one of
 * userId/guestId (not both, not neither).
 */
export async function recordQuestionAttempt(
  supabase: SupabaseClient,
  input: QuestionAttemptInput
): Promise<RecordAttemptResult> {
  if (!input.question?.id) return { ok: false, reason: "missing question id" };
  if (!input.userId && !input.guestId) return { ok: false, reason: "missing guest/user identity" };
  if (input.userId && input.guestId) return { ok: false, reason: "ambiguous identity: both userId and guestId set" };
  if (input.selectedResponse === undefined) return { ok: false, reason: "no answer submitted" };
  if (!input.attemptEventId) return { ok: false, reason: "missing attempt event id" };
  if (!input.sessionId) return { ok: false, reason: "missing session id" };
  if (!Number.isFinite(input.startedAt) || input.startedAt <= 0) return { ok: false, reason: "invalid start timestamp" };

  const completedAtMs = input.completedAt ?? Date.now();
  if (!Number.isFinite(completedAtMs) || completedAtMs < input.startedAt) {
    return { ok: false, reason: "invalid completion timestamp" };
  }

  const correct = isAnswerCorrect(input.question, input.selectedResponse);
  const selectedAnswer =
    typeof input.selectedResponse === "number" ? (input.question.choices[input.selectedResponse] ?? null) : input.selectedResponse;
  const correctAnswer =
    input.question.correctIndex !== null ? (input.question.choices[input.question.correctIndex] ?? null) : input.question.correctValue;
  const completedAtIso = new Date(completedAtMs).toISOString();

  const row = {
    user_id: input.userId,
    guest_id: input.userId ? null : input.guestId,
    session_id: input.sessionId,
    attempt_event_id: input.attemptEventId,
    question_id: input.question.id,
    domain: input.question.domain ?? null,
    topic: input.question.topic ?? null,
    difficulty: input.question.difficulty ?? null,
    practice_mode: input.practiceMode,
    source_name: SOURCE_NAME[input.practiceMode],
    selected_answer: selectedAnswer,
    correct_answer: correctAnswer,
    is_correct: correct,
    started_at: new Date(input.startedAt).toISOString(),
    completed_at: completedAtIso,
    time_spent_seconds: Math.max(0, Math.round(input.activeSeconds)),
    completion_date: completedAtIso.slice(0, 10)
  };

  const context = `question_id=${input.question.id} guest_id=${input.guestId ?? "-"} user_id=${input.userId ?? "-"} attempt_event_id=${input.attemptEventId} practice_mode=${input.practiceMode}`;
  // Temporary, deliberate debug visibility while wiring this up against a
  // real Supabase project — see the app's README section on guest
  // tracking. Cheap and harmless to leave in: one line per submitted
  // answer, not per render/poll.
  console.debug(`recordQuestionAttempt: writing (${context})`);

  // Upsert-ignore on the attempt_event_id unique index (see the migration)
  // instead of a plain insert: a double-click, a re-render, or a client
  // retry after the first insert already succeeded all resend the SAME
  // attempt_event_id, so this becomes a no-op rather than a second row. A
  // genuine retry of the QUESTION gets a fresh id from the caller, so it's
  // correctly recorded as a second, real attempt.
  const { data, error } = await supabase
    .from("question_attempts")
    .upsert(row, { onConflict: "attempt_event_id", ignoreDuplicates: true })
    .select();

  if (error) {
    console.error(`recordQuestionAttempt: write failed — ${describeError(error)} (${context})`);
    return { ok: false, reason: error.message };
  }

  // With ignoreDuplicates, a genuine duplicate returns an empty `data` array
  // (0 rows affected) and NO error — that's the intended no-op path, not a
  // failure, so it's still reported as ok. A fresh row returns the inserted
  // row back in `data`.
  console.debug(`recordQuestionAttempt: ${data && data.length > 0 ? "wrote 1 row" : "no-op (duplicate attempt_event_id)"} (${context})`);

  return { ok: true };
}
