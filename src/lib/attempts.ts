// Thin wrappers around the `attempts`, `practice_sessions`, and
// `review_queue` tables (db/migrations/0001_init.sql). Every function here
// takes a Supabase client so it works the same whether it's called from a
// Client Component (src/lib/supabase/client.ts) or a Server Component
// (src/lib/supabase/server.ts) — Row Level Security makes sure a student
// only ever sees or writes their own rows either way.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attempt, Confidence, Domain, TopicMastery } from "./types";
import type { ReviewItem } from "./reviewScheduler";

export type SessionType = "practice" | "full_test" | "diagnostic";

export async function startSession(supabase: SupabaseClient, userId: string, sessionType: SessionType) {
  const { data, error } = await supabase
    .from("practice_sessions")
    .insert({ user_id: userId, session_type: sessionType })
    .select("id")
    .single();

  if (error) throw new Error(`Could not start a practice session: ${error.message}`);
  return data.id as string;
}

export async function completeSession(
  supabase: SupabaseClient,
  sessionId: string,
  questionCount: number,
  correctCount: number
) {
  const { error } = await supabase
    .from("practice_sessions")
    .update({ completed_at: new Date().toISOString(), question_count: questionCount, correct_count: correctCount })
    .eq("id", sessionId);

  if (error) throw new Error(`Could not save the session result: ${error.message}`);
}

export type NewAttempt = {
  userId: string;
  sessionId: string | null;
  problemId: string;
  domain: Domain;
  topic: string;
  difficulty: string;
  correct: boolean;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  hintUsed: boolean;
  confidence: Confidence;
  timeSeconds: number | null;
};

export async function recordAttempt(supabase: SupabaseClient, attempt: NewAttempt) {
  const { error } = await supabase.from("attempts").insert({
    user_id: attempt.userId,
    session_id: attempt.sessionId,
    problem_id: attempt.problemId,
    domain: attempt.domain,
    topic: attempt.topic,
    difficulty: attempt.difficulty,
    correct: attempt.correct,
    selected_answer: attempt.selectedAnswer,
    correct_answer: attempt.correctAnswer,
    hint_used: attempt.hintUsed,
    confidence: attempt.confidence,
    time_seconds: attempt.timeSeconds
  });

  if (error) throw new Error(`Could not save that answer: ${error.message}`);
}

export async function fetchRecentAttempts(supabase: SupabaseClient, userId: string, limit = 200): Promise<Attempt[]> {
  const { data, error } = await supabase
    .from("attempts")
    .select("id, problem_id, domain, topic, difficulty, correct, hint_used, confidence, time_seconds, answered_at")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Could not load past attempts: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    problemId: row.problem_id,
    domain: row.domain as Domain,
    topic: row.topic,
    difficulty: row.difficulty,
    correct: row.correct,
    hintUsed: row.hint_used,
    confidence: row.confidence as Confidence,
    timeSeconds: row.time_seconds,
    answeredAt: row.answered_at
  }));
}

export async function fetchMasteryByTopic(supabase: SupabaseClient, userId: string): Promise<TopicMastery[]> {
  const { data, error } = await supabase.from("mastery_by_topic").select("*").eq("user_id", userId);

  if (error) throw new Error(`Could not load mastery summary: ${error.message}`);

  return data.map((row) => ({
    domain: row.domain as Domain,
    topic: row.topic,
    attempts: row.attempts,
    correct: row.correct,
    accuracy: row.accuracy,
    lastPracticedAt: row.last_practiced_at
  }));
}

export async function fetchReviewQueue(supabase: SupabaseClient, userId: string): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from("review_queue")
    .select("problem_id, review_stage, missed_at, next_review_at, last_reviewed_at")
    .eq("user_id", userId)
    .order("next_review_at", { ascending: true });

  if (error) throw new Error(`Could not load the review queue: ${error.message}`);

  return data.map((row) => ({
    problemId: row.problem_id,
    reviewStage: row.review_stage,
    missedAt: row.missed_at,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at
  }));
}

/** Adds a missed question to the review queue, or resets it to stage 0 if it's already there. */
export async function markMissedForReview(supabase: SupabaseClient, userId: string, problemId: string) {
  const { error } = await supabase
    .from("review_queue")
    .upsert(
      { user_id: userId, problem_id: problemId, review_stage: 0, missed_at: new Date().toISOString(), next_review_at: new Date().toISOString() },
      { onConflict: "user_id,problem_id" }
    );

  if (error) throw new Error(`Could not update the review queue: ${error.message}`);
}

/** Advances a review item after it's answered correctly, or removes it once it's fully learned. */
export async function advanceReviewItem(supabase: SupabaseClient, userId: string, item: ReviewItem, nextStage: number, nextReviewAt: string | null) {
  if (nextReviewAt === null) {
    const { error } = await supabase.from("review_queue").delete().eq("user_id", userId).eq("problem_id", item.problemId);
    if (error) throw new Error(`Could not clear the review item: ${error.message}`);
    return;
  }

  const { error } = await supabase
    .from("review_queue")
    .update({ review_stage: nextStage, next_review_at: nextReviewAt, last_reviewed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("problem_id", item.problemId);

  if (error) throw new Error(`Could not update the review item: ${error.message}`);
}
