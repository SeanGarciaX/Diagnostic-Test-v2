// The ONE write path every question-answering flow in the app calls into
// to record a submitted answer for Dashboard/Analytics
// (db/migrations/0002_question_attempts.sql). Today that's
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

export type QuestionAttemptInput = {
  /** Client-generated (crypto.randomUUID()) once per submission — the idempotency key. See the migration's comment on question_attempts.id. */
  attemptId: string;
  userId: string | null;
  guestId: string | null;
  /** Groups attempts from one practice/full-test sitting. Client-generated, not a foreign key. */
  sessionId: string;
  source: AttemptSource;
  question: Question;
  /** Whatever the student picked: a choice index for multiple choice, typed text for student-response. `undefined` means "no answer" — the attempt is rejected, not recorded, since opening/viewing a question doesn't count as completing it. */
  selectedResponse: number | string | undefined;
  /** ms epoch — when this question actually became active for the student. */
  startedAt: number;
  /** ms epoch — defaults to now. */
  submittedAt?: number;
  /** Active-time estimate in seconds, from useActiveTimeTracker (src/lib/activeTime.ts) — already idle/visibility-adjusted, not raw elapsed time. */
  activeSeconds: number;
};

export type RecordAttemptResult = { ok: true } | { ok: false; reason: string };

/**
 * Validates and records one submitted answer. Never throws — a malformed
 * or failed write is logged and reported back as `{ ok: false }` so a
 * broken analytics call can never take down the question-answering UI it's
 * attached to. Safe to call for both a guest and a signed-in student: pass
 * exactly one of userId/guestId (not both, not neither).
 */
export async function recordQuestionAttempt(
  supabase: SupabaseClient,
  input: QuestionAttemptInput
): Promise<RecordAttemptResult> {
  if (!input.question?.id) return { ok: false, reason: "missing question id" };
  if (!input.userId && !input.guestId) return { ok: false, reason: "missing guest/user identity" };
  if (input.userId && input.guestId) return { ok: false, reason: "ambiguous identity: both userId and guestId set" };
  if (input.selectedResponse === undefined) return { ok: false, reason: "no answer submitted" };
  if (!input.attemptId) return { ok: false, reason: "missing attempt id" };
  if (!input.sessionId) return { ok: false, reason: "missing session id" };
  if (!Number.isFinite(input.startedAt) || input.startedAt <= 0) return { ok: false, reason: "invalid start timestamp" };

  const submittedAtMs = input.submittedAt ?? Date.now();
  if (!Number.isFinite(submittedAtMs) || submittedAtMs < input.startedAt) {
    return { ok: false, reason: "invalid submission timestamp" };
  }

  const correct = isAnswerCorrect(input.question, input.selectedResponse);
  const selectedAnswer =
    typeof input.selectedResponse === "number" ? (input.question.choices[input.selectedResponse] ?? null) : input.selectedResponse;
  const correctAnswer =
    input.question.correctIndex !== null ? (input.question.choices[input.question.correctIndex] ?? null) : input.question.correctValue;

  const { error } = await supabase.from("question_attempts").insert({
    id: input.attemptId,
    user_id: input.userId,
    guest_id: input.userId ? null : input.guestId,
    session_id: input.sessionId,
    source: input.source,
    problem_id: input.question.id,
    domain: input.question.domain ?? null,
    topic: input.question.topic ?? null,
    difficulty: input.question.difficulty ?? null,
    selected_answer: selectedAnswer,
    correct_answer: correctAnswer,
    correct,
    started_at: new Date(input.startedAt).toISOString(),
    submitted_at: new Date(submittedAtMs).toISOString(),
    active_time_seconds: Math.max(0, Math.round(input.activeSeconds))
  });

  if (error) {
    // Postgres unique_violation on the primary key: this exact attemptId
    // was already recorded (a double-click, a re-render, a client retry
    // after the first insert actually succeeded). That's the intended
    // duplicate-prevention path, not a failure.
    if (error.code === "23505") return { ok: true };
    console.error("recordQuestionAttempt: insert failed:", error.message);
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}
