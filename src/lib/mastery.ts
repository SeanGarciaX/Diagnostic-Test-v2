// Mastery scoring — ported and cleaned up from the original Orbit-SAT
// prototype's lib/mastery-engine.ts, which had the same math but written
// as unreadable one-line functions. The formula below is unchanged; only
// the formatting and naming were rewritten for clarity.
//
// The idea: a single 0-100 "mastery score" per skill, built from five
// signals so that a student who guesses correctly without understanding
// (fast, no hints, but shaky confidence) doesn't outrank one who is
// genuinely solid. Accuracy still dominates the score (55% of it) — the
// other signals are there to catch mastery that accuracy alone would miss.

import type { Attempt, Confidence } from "./types";

export type MasteryProfile = {
  score: number; // 0-100 overall mastery
  attempts: number;
  accuracy: number; // 0-100, difficulty- and recency-weighted
  independence: number; // 0-100, % answered without a hint
  confidenceCalibration: number; // 0-100, how often confidence matched correctness
  pace: number; // 0-100, faster-than-2-minutes answers score higher
  retention: number; // 0-100, accuracy on just the last ~45 days of attempts
  status: "Starting" | "Developing" | "Secure" | "Mastered";
};

const EMPTY_MASTERY: MasteryProfile = {
  score: 0,
  attempts: 0,
  accuracy: 0,
  independence: 0,
  confidenceCalibration: 0,
  pace: 0,
  retention: 0,
  status: "Starting"
};

/** Harder questions count for more when they're answered correctly. */
function difficultyWeight(difficulty: string): number {
  if (difficulty === "Challenge" || difficulty === "Hard") return 1.18;
  if (difficulty === "Medium") return 1.08;
  if (difficulty === "Foundations" || difficulty === "Easy") return 0.94;
  return 1;
}

/** Recent attempts count more than old ones, decaying over ~45 days. */
function recencyWeight(answeredAt: string): number {
  const daysAgo = Math.max(0, (Date.now() - new Date(answeredAt).getTime()) / 86_400_000);
  return Math.max(0.55, Math.exp(-daysAgo / 45));
}

/**
 * How well a student's stated confidence matched whether they were right.
 * Being "Confident" and correct (or anything-but-confident and wrong) is a
 * well-calibrated guess and scores highest; "Okay" is treated as neutral;
 * a mismatch (confident-but-wrong, or unsure-but-correct) scores lowest.
 */
function calibrationScore(confidence: Confidence, correct: boolean): number {
  if (confidence === "Okay") return 0.65;
  const wasConfident = confidence === "Confident";
  return wasConfident === correct ? 1 : 0.35;
}

export function calculateMastery(attempts: Attempt[]): MasteryProfile {
  if (attempts.length === 0) return EMPTY_MASTERY;

  let weightedCorrect = 0;
  let weightedTotal = 0;
  let hintFreeCount = 0;
  let calibrationTotal = 0;
  let paceScoreTotal = 0;
  let paceScoreCount = 0;
  let recentCorrect = 0;
  let recentTotal = 0;

  for (const attempt of attempts) {
    const weight = difficultyWeight(attempt.difficulty) * recencyWeight(attempt.answeredAt);
    weightedTotal += weight;
    weightedCorrect += attempt.correct ? weight : 0;

    if (!attempt.hintUsed) hintFreeCount += 1;
    calibrationTotal += calibrationScore(attempt.confidence, attempt.correct);

    if (attempt.timeSeconds) {
      // 2 minutes (120s) is treated as a comfortable pace; faster scores higher.
      paceScoreTotal += Math.max(0, Math.min(1, 120 / attempt.timeSeconds));
      paceScoreCount += 1;
    }

    if (recencyWeight(attempt.answeredAt) > 0.8) {
      recentTotal += 1;
      recentCorrect += attempt.correct ? 1 : 0;
    }
  }

  const accuracy = Math.round((weightedCorrect / weightedTotal) * 100);
  const independence = Math.round((hintFreeCount / attempts.length) * 100);
  const confidenceCalibration = Math.round((calibrationTotal / attempts.length) * 100);
  const pace = Math.round((paceScoreCount ? paceScoreTotal / paceScoreCount : 0.65) * 100);
  const retention = Math.round(
    (recentTotal ? recentCorrect / recentTotal : weightedCorrect / weightedTotal) * 100
  );

  const score = Math.round(
    accuracy * 0.55 + independence * 0.12 + confidenceCalibration * 0.1 + pace * 0.08 + retention * 0.15
  );

  const status: MasteryProfile["status"] =
    score >= 88 && attempts.length >= 8
      ? "Mastered"
      : score >= 74 && attempts.length >= 5
        ? "Secure"
        : score >= 45
          ? "Developing"
          : "Starting";

  return { score, attempts: attempts.length, accuracy, independence, confidenceCalibration, pace, retention, status };
}

/** Groups attempts by topic and computes a mastery profile for each one. */
export function buildMasteryByTopic(attempts: Attempt[]): Record<string, MasteryProfile> {
  const topics = new Set(attempts.map((attempt) => attempt.topic));
  const result: Record<string, MasteryProfile> = {};
  for (const topic of topics) {
    result[topic] = calculateMastery(attempts.filter((attempt) => attempt.topic === topic));
  }
  return result;
}
