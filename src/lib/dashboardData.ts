// Read path for the Dashboard and Analytics pages. Every function here
// calls one of the SECURITY DEFINER aggregate functions from
// db/migrations/0002_question_attempts.sql instead of pulling raw attempt
// history into the browser — the aggregation happens in Postgres, so
// these pages stay fast regardless of how many questions a student has
// answered over time (see the migration file's own comments for why).
//
// Every function takes an `AnalyticsIdentity` (exactly one of userId/
// guestId set) so the exact same query works for today's guest and for a
// signed-in student later — no separate code path per identity type.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Domain } from "./types";

export type AnalyticsIdentity = { userId: string | null; guestId: string | null };

export type Fetched<T> = { ok: true; data: T } | { ok: false; error: string };

export type Totals = {
  totalAttempts: number;
  totalCorrect: number;
  totalUniqueQuestions: number;
  totalActiveSeconds: number;
  firstAttemptAt: string | null;
};

export type DailyStat = { day: string; attempts: number; correct: number; activeSeconds: number };
export type DomainStat = { domain: Domain | "Unknown"; attempts: number; correct: number; avgActiveSeconds: number | null };
export type DifficultyStat = { difficulty: string; attempts: number; correct: number };
export type RecentQuestionAttempt = {
  id: string;
  problemId: string;
  domain: string | null;
  topic: string | null;
  difficulty: string | null;
  source: string;
  correct: boolean;
  submittedAt: string;
  activeTimeSeconds: number;
};

function identityParams(identity: AnalyticsIdentity) {
  return { p_user_id: identity.userId, p_guest_id: identity.guestId };
}

/** True once a real identity (guest cookie or signed-in user) is known — before that there's nothing to query at all, which is a distinct state from "queried and found zero rows." */
export function hasIdentity(identity: AnalyticsIdentity): boolean {
  return Boolean(identity.userId || identity.guestId);
}

const EMPTY_TOTALS: Totals = {
  totalAttempts: 0,
  totalCorrect: 0,
  totalUniqueQuestions: 0,
  totalActiveSeconds: 0,
  firstAttemptAt: null
};

export async function fetchTotals(supabase: SupabaseClient, identity: AnalyticsIdentity): Promise<Fetched<Totals>> {
  if (!hasIdentity(identity)) return { ok: true, data: EMPTY_TOTALS };

  const { data, error } = await supabase.rpc("question_attempts_totals", identityParams(identity));
  if (error) return { ok: false, error: error.message };
  const row = data?.[0];
  if (!row) return { ok: true, data: EMPTY_TOTALS };

  return {
    ok: true,
    data: {
      totalAttempts: row.total_attempts ?? 0,
      totalCorrect: row.total_correct ?? 0,
      totalUniqueQuestions: row.total_unique_questions ?? 0,
      totalActiveSeconds: Number(row.total_active_seconds ?? 0),
      firstAttemptAt: row.first_attempt_at ?? null
    }
  };
}

export async function fetchDaily(supabase: SupabaseClient, identity: AnalyticsIdentity, days = 35): Promise<Fetched<DailyStat[]>> {
  if (!hasIdentity(identity)) return { ok: true, data: [] };

  const { data, error } = await supabase.rpc("question_attempts_daily", { ...identityParams(identity), p_days: days });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: (data ?? []).map((row: { day: string; attempts: number; correct: number; active_seconds: number }) => ({
      day: row.day,
      attempts: row.attempts ?? 0,
      correct: row.correct ?? 0,
      activeSeconds: Number(row.active_seconds ?? 0)
    }))
  };
}

export async function fetchDomainSummary(supabase: SupabaseClient, identity: AnalyticsIdentity): Promise<Fetched<DomainStat[]>> {
  if (!hasIdentity(identity)) return { ok: true, data: [] };

  const { data, error } = await supabase.rpc("question_attempts_domain_summary", identityParams(identity));
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: (data ?? []).map((row: { domain: string; attempts: number; correct: number; avg_active_seconds: number | null }) => ({
      domain: row.domain as Domain | "Unknown",
      attempts: row.attempts ?? 0,
      correct: row.correct ?? 0,
      avgActiveSeconds: row.avg_active_seconds === null ? null : Number(row.avg_active_seconds)
    }))
  };
}

export async function fetchDifficultySummary(supabase: SupabaseClient, identity: AnalyticsIdentity): Promise<Fetched<DifficultyStat[]>> {
  if (!hasIdentity(identity)) return { ok: true, data: [] };

  const { data, error } = await supabase.rpc("question_attempts_difficulty_summary", identityParams(identity));
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: (data ?? []).map((row: { difficulty: string; attempts: number; correct: number }) => ({
      difficulty: row.difficulty,
      attempts: row.attempts ?? 0,
      correct: row.correct ?? 0
    }))
  };
}

export async function fetchRecentQuestionAttempts(
  supabase: SupabaseClient,
  identity: AnalyticsIdentity,
  limit = 30
): Promise<Fetched<RecentQuestionAttempt[]>> {
  if (!hasIdentity(identity)) return { ok: true, data: [] };

  const { data, error } = await supabase.rpc("question_attempts_recent", { ...identityParams(identity), p_limit: limit });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: (data ?? []).map(
      (row: {
        id: string;
        problem_id: string;
        domain: string | null;
        topic: string | null;
        difficulty: string | null;
        source: string;
        correct: boolean;
        submitted_at: string;
        active_time_seconds: number;
      }) => ({
        id: row.id,
        problemId: row.problem_id,
        domain: row.domain,
        topic: row.topic,
        difficulty: row.difficulty,
        source: row.source,
        correct: row.correct,
        submittedAt: row.submitted_at,
        activeTimeSeconds: row.active_time_seconds ?? 0
      })
    )
  };
}

// --- Derived helpers shared by Dashboard + Analytics -----------------

const DAY_MS = 86_400_000;

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's day key in the same UTC-day bucketing the SQL aggregate functions use, so client-computed "today" always lines up with what's actually in the `day` column. */
export function todayKey(now = new Date()): string {
  return toDayKey(now);
}

/** The last `count` day keys ending today (oldest first) — e.g. for a 7-day chart's x-axis. */
export function lastNDayKeys(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => toDayKey(new Date(now.getTime() - (count - 1 - i) * DAY_MS)));
}

/** Sums attempts/correct/activeSeconds for the daily rows falling on or after `sinceDaysAgo` (inclusive of today). */
export function sumDailyWindow(daily: DailyStat[], sinceDaysAgo: number, now = new Date()): { attempts: number; correct: number; activeSeconds: number } {
  const cutoff = toDayKey(new Date(now.getTime() - sinceDaysAgo * DAY_MS));
  return daily
    .filter((row) => row.day >= cutoff)
    .reduce(
      (acc, row) => ({
        attempts: acc.attempts + row.attempts,
        correct: acc.correct + row.correct,
        activeSeconds: acc.activeSeconds + row.activeSeconds
      }),
      { attempts: 0, correct: 0, activeSeconds: 0 }
    );
}

export function dailyRowFor(daily: DailyStat[], day: string): DailyStat {
  return daily.find((row) => row.day === day) ?? { day, attempts: 0, correct: 0, activeSeconds: 0 };
}

/** Consecutive-day practice streak ending today or yesterday (a streak "survives" until a full day is missed). */
export function currentStreak(daily: DailyStat[], now = new Date()): number {
  const practicedDays = new Set(daily.filter((row) => row.attempts > 0).map((row) => row.day));
  let streak = 0;
  let cursor = new Date(now);

  // If today has no practice yet, the streak isn't broken until the day
  // actually ends — start counting from yesterday instead so a student
  // mid-streak doesn't see it reset to 0 before they've even practiced today.
  if (!practicedDays.has(toDayKey(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);

  while (practicedDays.has(toDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

export function accuracyPercent(correct: number, attempts: number): number | null {
  return attempts > 0 ? Math.round((correct / attempts) * 100) : null;
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
