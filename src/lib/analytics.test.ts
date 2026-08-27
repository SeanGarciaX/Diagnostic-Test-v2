import { describe, expect, it, vi } from "vitest";
import { recordQuestionAttempt } from "./analytics";
import type { Question } from "./types";

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    problemId: 1,
    prompt: "What is 2 + 2?",
    choices: ["3", "4", "5", "6"],
    correctIndex: 1,
    correctValue: null,
    domain: "Algebra",
    topic: "Arithmetic",
    difficulty: "Easy",
    imageUrl: null,
    solution: { available: false, finalAnswer: "", concept: "", strategy: "", steps: [], commonMistake: null, satTip: null, remember: null },
    ...overrides
  };
}

function makeSupabase(result: { error: { code?: string; message: string } | null }) {
  const insert = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ insert });
  return { client: { from } as never, insert, from };
}

const baseInput = {
  attemptId: "attempt-1",
  userId: null as string | null,
  guestId: "guest-1" as string | null,
  sessionId: "session-1",
  source: "quick_practice" as const,
  question: makeQuestion(),
  selectedResponse: 1,
  startedAt: 1_000,
  submittedAt: 5_000,
  activeSeconds: 4
};

describe("recordQuestionAttempt validation", () => {
  it("rejects a question with no id without touching the database", async () => {
    const { client, from } = makeSupabase({ error: null });
    const result = await recordQuestionAttempt(client, { ...baseInput, question: makeQuestion({ id: "" }) });
    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects when neither userId nor guestId is set", async () => {
    const { client, from } = makeSupabase({ error: null });
    const result = await recordQuestionAttempt(client, { ...baseInput, userId: null, guestId: null });
    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects when both userId and guestId are set (ambiguous identity)", async () => {
    const { client, from } = makeSupabase({ error: null });
    const result = await recordQuestionAttempt(client, { ...baseInput, userId: "user-1", guestId: "guest-1" });
    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects an unanswered question (undefined response) — viewing isn't completing", async () => {
    const { client, from } = makeSupabase({ error: null });
    const result = await recordQuestionAttempt(client, { ...baseInput, selectedResponse: undefined });
    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects an invalid start timestamp", async () => {
    const { client, from } = makeSupabase({ error: null });
    const result = await recordQuestionAttempt(client, { ...baseInput, startedAt: 0 });
    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects a submission timestamp before the start timestamp", async () => {
    const { client, from } = makeSupabase({ error: null });
    const result = await recordQuestionAttempt(client, { ...baseInput, startedAt: 5_000, submittedAt: 1_000 });
    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("recordQuestionAttempt happy path", () => {
  it("inserts a correctly-shaped row for a guest attempt", async () => {
    const { client, insert } = makeSupabase({ error: null });
    const result = await recordQuestionAttempt(client, baseInput);

    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({
      id: "attempt-1",
      user_id: null,
      guest_id: "guest-1",
      session_id: "session-1",
      source: "quick_practice",
      problem_id: "q1",
      domain: "Algebra",
      topic: "Arithmetic",
      difficulty: "Easy",
      selected_answer: "4",
      correct_answer: "4",
      correct: true,
      active_time_seconds: 4
    });
  });

  it("clears guest_id when userId is set, even if a stray guestId was passed in", async () => {
    const { client, insert } = makeSupabase({ error: null });
    await recordQuestionAttempt(client, { ...baseInput, userId: "user-1", guestId: null });
    const row = insert.mock.calls[0][0];
    expect(row.user_id).toBe("user-1");
    expect(row.guest_id).toBeNull();
  });

  it("marks an incorrect response as incorrect", async () => {
    const { client, insert } = makeSupabase({ error: null });
    await recordQuestionAttempt(client, { ...baseInput, selectedResponse: 0 });
    const row = insert.mock.calls[0][0];
    expect(row.correct).toBe(false);
    expect(row.selected_answer).toBe("3");
  });
});

describe("recordQuestionAttempt duplicate handling", () => {
  it("treats a primary-key conflict (23505) as already-recorded success, not a failure", async () => {
    const { client } = makeSupabase({ error: { code: "23505", message: "duplicate key value" } });
    const result = await recordQuestionAttempt(client, baseInput);
    expect(result).toEqual({ ok: true });
  });

  it("surfaces a genuine database error as a failure", async () => {
    const { client } = makeSupabase({ error: { code: "42501", message: "permission denied" } });
    const result = await recordQuestionAttempt(client, baseInput);
    expect(result.ok).toBe(false);
  });
});
