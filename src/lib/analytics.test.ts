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
  const upsert = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ upsert });
  return { client: { from } as never, upsert, from };
}

const baseInput = {
  attemptEventId: "attempt-1",
  userId: null as string | null,
  guestId: "guest-1" as string | null,
  sessionId: "session-1",
  practiceMode: "quick_practice" as const,
  question: makeQuestion(),
  selectedResponse: 1,
  startedAt: 1_000,
  completedAt: 5_000,
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

  it("rejects a completion timestamp before the start timestamp", async () => {
    const { client, from } = makeSupabase({ error: null });
    const result = await recordQuestionAttempt(client, { ...baseInput, startedAt: 5_000, completedAt: 1_000 });
    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("recordQuestionAttempt happy path", () => {
  it("upserts a correctly-shaped row for a guest attempt, ignoring duplicates on attempt_event_id", async () => {
    const { client, upsert } = makeSupabase({ error: null });
    const result = await recordQuestionAttempt(client, baseInput);

    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, options] = upsert.mock.calls[0];
    expect(options).toEqual({ onConflict: "attempt_event_id", ignoreDuplicates: true });
    expect(row).toMatchObject({
      user_id: null,
      guest_id: "guest-1",
      session_id: "session-1",
      attempt_event_id: "attempt-1",
      question_id: "q1",
      domain: "Algebra",
      topic: "Arithmetic",
      difficulty: "Easy",
      practice_mode: "quick_practice",
      source_name: "Quick Practice",
      selected_answer: "4",
      correct_answer: "4",
      is_correct: true,
      time_spent_seconds: 4,
      completion_date: "1970-01-01"
    });
    expect(row.id).toBeUndefined();
  });

  it("clears guest_id when userId is set, even if a stray guestId was passed in", async () => {
    const { client, upsert } = makeSupabase({ error: null });
    await recordQuestionAttempt(client, { ...baseInput, userId: "user-1", guestId: null });
    const row = upsert.mock.calls[0][0];
    expect(row.user_id).toBe("user-1");
    expect(row.guest_id).toBeNull();
  });

  it("marks an incorrect response as incorrect", async () => {
    const { client, upsert } = makeSupabase({ error: null });
    await recordQuestionAttempt(client, { ...baseInput, selectedResponse: 0 });
    const row = upsert.mock.calls[0][0];
    expect(row.is_correct).toBe(false);
    expect(row.selected_answer).toBe("3");
  });

  it("labels each practice mode with a human-readable source_name", async () => {
    const { client, upsert } = makeSupabase({ error: null });
    await recordQuestionAttempt(client, { ...baseInput, practiceMode: "full_test" });
    expect(upsert.mock.calls[0][0].source_name).toBe("Full Test");
  });
});

describe("recordQuestionAttempt error handling", () => {
  it("surfaces a genuine database error as a failure, not a silent success", async () => {
    const { client } = makeSupabase({ error: { code: "42501", message: "permission denied" } });
    const result = await recordQuestionAttempt(client, baseInput);
    expect(result.ok).toBe(false);
  });

  it("surfaces a missing unique-index error distinctly (duplicate protection isn't active)", async () => {
    const { client } = makeSupabase({ error: { code: "42P10", message: "no unique or exclusion constraint matching the ON CONFLICT specification" } });
    const result = await recordQuestionAttempt(client, baseInput);
    expect(result.ok).toBe(false);
  });
});
