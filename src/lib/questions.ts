// Reads real SAT Math questions from the existing Supabase table (the same
// one the original Diagnostic-Test app used) and converts each row into
// the clean `Question` shape the rest of the app works with. This file is
// the direct replacement for Orbit-SAT's lib/question-engine.ts, which
// generated fake arithmetic questions from templates instead of using
// real content.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Domain, Question, QuestionSolution, SolutionStep } from "./types";
import { mathifyPrompt, normalizeMath, stripHtml } from "./mathText";

const DEFAULT_TABLE = process.env.NEXT_PUBLIC_QUESTION_TABLE || "Practice_Test_Questions";

// The raw shape of a row in the question table. Optional/nullable fields
// reflect that not every row is fully filled in yet.
type QuestionRow = {
  problem_id: string | number | null;
  question_number: number | null;
  question_text: string | null;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | number | null;
  answer_value: string | number | null;
  topic: string | null;
  difficulty: string | null;
  domain: string | null;
  img_url: string | null;
  solutions: unknown;
};

const KNOWN_DOMAINS: Domain[] = [
  "Algebra",
  "Advanced Math",
  "Problem-Solving and Data Analysis",
  "Geometry and Trigonometry"
];

function normalizeDomain(value: string | null): Domain {
  const match = KNOWN_DOMAINS.find((domain) => domain.toLowerCase() === (value ?? "").toLowerCase());
  return match ?? "Algebra";
}

/** Converts A/B/C/D, "1"-"4", "0"-"3", or exact answer text into a 0-based index. */
function resolveCorrectIndex(correctAnswer: QuestionRow["correct_answer"], choices: string[]): number | null {
  if (correctAnswer === null || correctAnswer === undefined) return null;

  if (typeof correctAnswer === "number") {
    if (correctAnswer >= 0 && correctAnswer <= 3) return correctAnswer;
    if (correctAnswer >= 1 && correctAnswer <= 4) return correctAnswer - 1;
    return null;
  }

  const value = correctAnswer.trim();
  const letterIndex = ["A", "B", "C", "D"].indexOf(value.toUpperCase());
  if (letterIndex !== -1) return letterIndex;

  if (/^\d+$/.test(value)) {
    const n = Number(value);
    if (n >= 0 && n <= 3) return n;
    if (n >= 1 && n <= 4) return n - 1;
  }

  const textIndex = choices.findIndex((choice) => choice.trim().toLowerCase() === value.toLowerCase());
  return textIndex === -1 ? null : textIndex;
}

function parseSolution(raw: unknown): QuestionSolution {
  const empty: QuestionSolution = {
    available: false,
    finalAnswer: "",
    concept: "",
    strategy: "",
    steps: [],
    commonMistake: null,
    satTip: null
  };

  const data = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!data || typeof data !== "object") return empty;

  const solution = data as Record<string, unknown>;
  const rawSteps = Array.isArray(solution.steps) ? solution.steps : [];

  const steps: SolutionStep[] = rawSteps
    .filter((step): step is Record<string, unknown> => typeof step === "object" && step !== null)
    .map((step) => {
      const workLines = Array.isArray(step.math_lines)
        ? step.math_lines
        : typeof step.work === "string"
          ? step.work.split(";")
          : [];

      return {
        title: stripHtml(String(step.title ?? step.label ?? "")),
        explanation: stripHtml(String(step.explanation ?? step.text ?? "")),
        mathLines: workLines.map((line) => normalizeMath(String(line))).filter(Boolean),
        rule: step.rule ? stripHtml(String(step.rule)) : null
      };
    });

  return {
    available: steps.length > 0,
    finalAnswer: stripHtml(String(solution.correct_answer ?? "")),
    concept: stripHtml(String(solution.concept ?? "")),
    strategy: stripHtml(String(solution.strategy ?? "")),
    steps,
    commonMistake: solution.common_mistake ? stripHtml(String(solution.common_mistake)) : null,
    satTip: solution.sat_tip ? stripHtml(String(solution.sat_tip)) : null
  };
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function rowToQuestion(row: QuestionRow): Question | null {
  const prompt = mathifyPrompt(row.question_text);
  if (!prompt) return null;

  const rawChoices = [row.option_a, row.option_b, row.option_c, row.option_d];
  const hasAllChoices = rawChoices.every((choice) => choice !== null && choice.trim() !== "");
  const choices = hasAllChoices ? rawChoices.map((choice) => mathifyPrompt(choice)) : [];

  const id = String(row.problem_id ?? row.question_number ?? "");
  if (!id) return null;

  if (hasAllChoices) {
    const correctIndex = resolveCorrectIndex(row.correct_answer, choices);
    if (correctIndex === null) return null;
    return {
      id,
      prompt,
      choices,
      correctIndex,
      correctValue: null,
      domain: normalizeDomain(row.domain),
      topic: row.topic || "General",
      difficulty: row.difficulty || "Medium",
      imageUrl: row.img_url,
      solution: parseSolution(row.solutions)
    };
  }

  const answerValue = row.answer_value === null ? null : String(row.answer_value).trim();
  if (!answerValue) return null;

  return {
    id,
    prompt,
    choices: [],
    correctIndex: null,
    correctValue: answerValue,
    domain: normalizeDomain(row.domain),
    topic: row.topic || "General",
    difficulty: row.difficulty || "Medium",
    imageUrl: row.img_url,
    solution: parseSolution(row.solutions)
  };
}

/** Fetches and normalizes up to `limit` questions, ordered the same way as the source app. */
export async function fetchQuestions(
  supabase: SupabaseClient,
  limit = 44,
  table = DEFAULT_TABLE
): Promise<Question[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("question_number", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Could not load questions from "${table}": ${error.message}`);

  const questions = (data as QuestionRow[]).map(rowToQuestion).filter((q): q is Question => q !== null);
  return questions;
}

/** Selects the questions matching a list of problem IDs, e.g. for a spaced-review session. */
export function questionsByIds(questions: Question[], ids: string[]): Question[] {
  const idSet = new Set(ids);
  return questions.filter((question) => idSet.has(question.id));
}

/** Picks up to `count` questions for a practice session, optionally focused on one domain. */
export function pickPracticeSet(questions: Question[], domain: Domain | null, count: number): Question[] {
  const pool = domain ? questions.filter((question) => question.domain === domain) : questions;
  const source = pool.length >= count ? pool : questions; // fall back to the full bank if the domain is too small
  return shuffle(source).slice(0, count);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Checks a student's answer against a question, for both question types. */
export function isAnswerCorrect(question: Question, response: number | string | undefined): boolean {
  if (question.correctIndex !== null) return response === question.correctIndex;
  if (question.correctValue !== null) {
    return String(response ?? "").trim().replaceAll(",", "") === question.correctValue.replaceAll(",", "");
  }
  return false;
}
