import { describe, expect, it } from "vitest";
import { isAnswerCorrect, selectFullTestBank } from "./questions";
import type { Question } from "./types";

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: "1",
    problemId: 1,
    prompt: "Solve for x.",
    choices: [],
    correctIndex: null,
    correctValue: null,
    domain: "Algebra",
    topic: "Linear equations",
    difficulty: "Medium",
    imageUrl: null,
    solution: { available: false, finalAnswer: "", concept: "", strategy: "", steps: [], commonMistake: null, satTip: null, remember: null },
    ...overrides
  };
}

describe("isAnswerCorrect", () => {
  it("matches multiple-choice by exact index", () => {
    const question = makeQuestion({ choices: ["A", "B", "C", "D"], correctIndex: 2 });
    expect(isAnswerCorrect(question, 2)).toBe(true);
    expect(isAnswerCorrect(question, 1)).toBe(false);
  });

  it("matches a typed answer as plain text", () => {
    const question = makeQuestion({ correctValue: "12" });
    expect(isAnswerCorrect(question, "12")).toBe(true);
    expect(isAnswerCorrect(question, " 12 ")).toBe(true);
  });

  it("accepts a fraction and its decimal equivalent as the same answer", () => {
    const question = makeQuestion({ correctValue: "7/2" });
    expect(isAnswerCorrect(question, "3.5")).toBe(true);
    expect(isAnswerCorrect(question, "7/2")).toBe(true);
  });

  it("ignores commas in numeric answers", () => {
    const question = makeQuestion({ correctValue: "1,000" });
    expect(isAnswerCorrect(question, "1000")).toBe(true);
  });

  it("rejects an empty or unrelated answer", () => {
    const question = makeQuestion({ correctValue: "5" });
    expect(isAnswerCorrect(question, "")).toBe(false);
    expect(isAnswerCorrect(question, "6")).toBe(false);
  });
});

describe("selectFullTestBank", () => {
  const bank = Array.from({ length: 44 }, (_, i) => makeQuestion({ id: String(i + 1), problemId: i + 1 }));

  it("routes standard difficulty to problem_id 1-22", () => {
    const selected = selectFullTestBank(bank, "standard");
    expect(selected).toHaveLength(22);
    expect(selected.map((q) => q.problemId)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
  });

  it("routes lower difficulty to problem_id 23-44", () => {
    const selected = selectFullTestBank(bank, "lower");
    expect(selected).toHaveLength(22);
    expect(selected.map((q) => q.problemId)).toEqual(Array.from({ length: 22 }, (_, i) => i + 23));
  });
});
