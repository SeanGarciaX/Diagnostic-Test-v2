import { describe, expect, it } from "vitest";
import { calculateMastery } from "./mastery";
import type { Attempt } from "./types";

function makeAttempt(overrides: Partial<Attempt>): Attempt {
  return {
    id: "1",
    problemId: "1",
    domain: "Algebra",
    topic: "Linear equations",
    difficulty: "Medium",
    correct: true,
    hintUsed: false,
    confidence: "Confident",
    timeSeconds: 60,
    answeredAt: new Date().toISOString(),
    ...overrides
  };
}

describe("calculateMastery", () => {
  it("returns a zeroed profile with no attempts", () => {
    const profile = calculateMastery([]);
    expect(profile.attempts).toBe(0);
    expect(profile.status).toBe("Starting");
  });

  it("scores a perfect, confident, hint-free run as mastered given enough attempts", () => {
    const attempts = Array.from({ length: 10 }, () => makeAttempt({}));
    const profile = calculateMastery(attempts);
    expect(profile.accuracy).toBe(100);
    expect(profile.independence).toBe(100);
    expect(profile.status).toBe("Mastered");
  });

  it("keeps mastery score within 0-100", () => {
    const attempts = Array.from({ length: 10 }, (_, i) => makeAttempt({ correct: i % 2 === 0, hintUsed: true, confidence: "Unsure" }));
    const profile = calculateMastery(attempts);
    expect(profile.score).toBeGreaterThanOrEqual(0);
    expect(profile.score).toBeLessThanOrEqual(100);
  });

  it("penalizes hint use in the independence signal", () => {
    const withHints = calculateMastery(Array.from({ length: 5 }, () => makeAttempt({ hintUsed: true })));
    const withoutHints = calculateMastery(Array.from({ length: 5 }, () => makeAttempt({ hintUsed: false })));
    expect(withoutHints.independence).toBeGreaterThan(withHints.independence);
  });
});
