// Picks the single best next skill for a student to practice, based on
// their recent attempts. Ported and cleaned up from Orbit-SAT's
// lib/adaptive.ts (same formula, rewritten for readability).
//
// The core idea: rank each skill by "uncertainty" — how unsure we are that
// the student has actually mastered it — and recommend the most uncertain
// one. Low accuracy drives uncertainty the most, but a skill answered
// correctly only with hints, low confidence, or a lot of time is still
// flagged as uncertain even if the raw accuracy looks fine.

import type { Attempt, Domain } from "./types";

export type Recommendation = {
  domain: Domain;
  topic: string;
  difficulty: "Foundations" | "Medium" | "Challenge";
  reason: string;
  accuracy: number;
  attempts: number;
};

const FALLBACK: Recommendation = {
  domain: "Advanced Math",
  topic: "Functions and factoring",
  difficulty: "Foundations",
  reason: "A balanced starting point before we have enough history on you yet.",
  accuracy: 0,
  attempts: 0
};

const RECENT_ATTEMPT_WINDOW = 80;

type SkillStats = {
  domain: Domain;
  topic: string;
  weightedCorrect: number;
  correct: number;
  attempts: number;
  hintUsed: number;
  lowConfidence: number;
  slowAnswers: number;
};

export function recommendPractice(attempts: Attempt[]): Recommendation {
  if (attempts.length === 0) return FALLBACK;

  const recent = attempts.slice(0, RECENT_ATTEMPT_WINDOW);
  const bySkill = new Map<string, SkillStats>();

  recent.forEach((attempt, index) => {
    const key = `${attempt.domain}|${attempt.topic}`;
    const stats = bySkill.get(key) ?? {
      domain: attempt.domain,
      topic: attempt.topic,
      weightedCorrect: 0,
      correct: 0,
      attempts: 0,
      hintUsed: 0,
      lowConfidence: 0,
      slowAnswers: 0
    };

    // More recent attempts (lower index) count for more.
    const recencyBoost = Math.max(0.35, 1 - (index / recent.length) * 0.65);
    stats.weightedCorrect += attempt.correct ? recencyBoost : 0;
    stats.correct += attempt.correct ? 1 : 0;
    stats.attempts += 1;
    stats.hintUsed += attempt.hintUsed ? 1 : 0;
    stats.lowConfidence += attempt.confidence === "Unsure" ? 1 : 0;
    stats.slowAnswers += (attempt.timeSeconds ?? 0) > 90 ? 1 : 0;

    bySkill.set(key, stats);
  });

  const ranked = Array.from(bySkill.values())
    .map((stats) => {
      const accuracy = stats.correct / stats.attempts;
      const neededSupport = (stats.hintUsed + stats.lowConfidence) / stats.attempts;
      const slowRate = stats.slowAnswers / stats.attempts;
      const tooFewAttempts = Math.max(0, 4 - stats.attempts) / 4;
      const uncertainty = (1 - accuracy) * 0.64 + neededSupport * 0.18 + slowRate * 0.08 + tooFewAttempts * 0.1;
      return { ...stats, accuracy, uncertainty };
    })
    .sort((a, b) => b.uncertainty - a.uncertainty);

  const focus = ranked[0];
  const accuracyPercent = Math.round(focus.accuracy * 100);
  const difficulty: Recommendation["difficulty"] =
    focus.attempts < 3 || accuracyPercent < 55 ? "Foundations" : accuracyPercent >= 85 && focus.attempts >= 5 ? "Challenge" : "Medium";

  const signals = [
    focus.hintUsed ? `${focus.hintUsed} hint-assisted` : "",
    focus.lowConfidence ? `${focus.lowConfidence} low-confidence` : "",
    focus.slowAnswers ? `${focus.slowAnswers} slow-paced` : ""
  ]
    .filter(Boolean)
    .join(", ");

  return {
    domain: focus.domain,
    topic: focus.topic,
    difficulty,
    accuracy: accuracyPercent,
    attempts: focus.attempts,
    reason: `Highest-value recent skill: ${accuracyPercent}% accuracy across ${focus.attempts} attempt${focus.attempts === 1 ? "" : "s"}${signals ? ` · ${signals}` : ""}`
  };
}
