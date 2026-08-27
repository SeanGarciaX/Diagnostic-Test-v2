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

  // Upsert-ignore on the attempt_event_id unique index (see the migration)
  // instead of a plain insert: a double-click, a re-render, or a client
  // retry after the first insert already succeeded all resend the SAME
  // attempt_event_id, so this becomes a no-op rather than a second row. A
  // genuine retry of the QUESTION gets a fresh id from the caller, so it's
  // correctly recorded as a second, real attempt.
  const { error } = await supabase.from("question_attempts").upsert(row, { onConflict: "attempt_event_id", ignoreDuplicates: true });

  if (error) {
    const context = `question_id=${input.question.id} guest_id=${input.guestId ?? "-"} user_id=${input.userId ?? "-"} attempt_event_id=${input.attemptEventId}`;
    if (error.code === "42P10") {
      // "there is no unique or exclusion constraint matching the ON
      // CONFLICT specification" — the table is missing the unique index
      // this idempotency strategy depends on. Surface this loudly: it's a
      // schema problem, not a transient failure, and duplicate protection
      // is silently NOT working until it's fixed (see the migration file).
      console.error(
        `recordQuestionAttempt: question_attempts.attempt_event_id has no unique index — duplicate protection is not active. Run db/migrations/0003_question_attempts_guest_schema.sql. (${context})`
      );
    } else {
      console.error(`recordQuestionAttempt: insert failed: ${error.message} (${context})`);
    }
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}
