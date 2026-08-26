// Reads real SAT Math questions from the existing Supabase table (the same
// one the original Diagnostic-Test app used) and converts each row into
// the clean `Question` shape the rest of the app works with. This file is
// the direct replacement for Orbit-SAT's lib/question-engine.ts, which
// generated fake arithmetic questions from templates instead of using
// real content.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Domain, GeometryDiagram, Question, QuestionSolution, SolutionStep } from "./types";
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

function parseDiagram(raw: unknown): GeometryDiagram | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const type = value.type;
  if (type !== "triangle" && type !== "right_triangle" && type !== "circle" && type !== "coordinate_plane") return null;

  const points = Array.isArray(value.points)
    ? value.points
        .filter((point): point is Record<string, unknown> => typeof point === "object" && point !== null)
        .map((point) => ({
          x: Number(point.x) || 0,
          y: Number(point.y) || 0,
          label: point.label ? String(point.label) : undefined
        }))
    : undefined;

  return {
    type,
    rightAngle: Boolean(value.right_angle),
    labels: (value.labels as Record<string, string>) ?? undefined,
    sideLabels: (value.side_labels as Record<string, string>) ?? undefined,
    radius: value.radius ? String(value.radius) : undefined,
    radiusLabel: value.radius_label ? String(value.radius_label) : undefined,
    points
  };
}

function parseSolution(raw: unknown): QuestionSolution {
  const empty: QuestionSolution = {
    available: false,
    finalAnswer: "",
    concept: "",
    strategy: "",
    steps: [],
    commonMistake: null,
    satTip: null,
    remember: null
  };

  const data = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!data || typeof data !== "object") return empty;

  const solution = data as Record<string, unknown>;
  const rawSteps = Array.isArray(solution.steps) ? solution.steps : [];

  const steps: SolutionStep[] = rawSteps
    .filter((step): step is Record<string, unknown> => typeof step === "object" && step !== null)
    .map((step) => {
      const rawMathLines = Array.isArray(step.math_lines) ? step.math_lines : [];
      const rawWorkLines = Array.isArray(step.work_lines)
        ? step.work_lines
        : typeof step.work === "string"
          ? step.work.split(";")
          : [];
      const keywords = Array.isArray(step.keywords) ? step.keywords.map((item) => String(item)) : [];

      return {
        title: stripHtml(String(step.title ?? step.label ?? "")),
        explanation: stripHtml(String(step.explanation ?? step.text ?? "")),
        keywords,
        mathLines: rawMathLines.map((line) => normalizeMath(String(line))).filter(Boolean),
        workLines: rawWorkLines.map((line) => stripHtml(String(line))).filter(Boolean),
        rule: step.rule ? stripHtml(String(step.rule)) : null,
        why: step.why ? stripHtml(String(step.why)) : null,
        formula: step.formula ? normalizeMath(String(step.formula)) : null,
        formulaName: step.formula_name ? stripHtml(String(step.formula_name)) : null,
        diagram: parseDiagram(step.diagram)
      };
    });

  return {
    available: steps.length > 0,
    finalAnswer: stripHtml(String(solution.correct_answer ?? "")),
    concept: stripHtml(String(solution.concept ?? "")),
    strategy: stripHtml(String(solution.strategy ?? "")),
    steps,
    commonMistake: solution.common_mistake ? stripHtml(String(solution.common_mistake)) : null,
    satTip: solution.sat_tip ? stripHtml(String(solution.sat_tip)) : null,
    remember: solution.remember ? stripHtml(String(solution.remember)) : null
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
  const problemId = row.problem_id === null || row.problem_id === undefined ? null : Number(row.problem_id);

  if (hasAllChoices) {
    const correctIndex = resolveCorrectIndex(row.correct_answer, choices);
    if (correctIndex === null) return null;
    return {
      id,
      problemId: Number.isFinite(problemId) ? problemId : null,
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
    problemId: Number.isFinite(problemId) ? problemId : null,
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

/**
 * Checks a student's answer against a question. Multiple-choice is an
 * exact index match. For a typed-in answer, this matches the original
 * Diagnostic-Test app's rule: normalized text match, or (since "7/2" and
 * "3.5" are both valid for the same question) a numeric match — including
 * parsing a "a/b" fraction — within a tiny floating-point tolerance.
 */
export function isAnswerCorrect(question: Question, response: number | string | undefined): boolean {
  if (question.correctIndex !== null) return response === question.correctIndex;
  if (question.correctValue === null) return false;

  const student = normalizeAnswerText(response);
  const correct = normalizeAnswerText(question.correctValue);
  if (!student) return false;
  if (student.toLowerCase() === correct.toLowerCase()) return true;

  const studentNumber = parseAnswerNumber(student);
  const correctNumber = parseAnswerNumber(correct);
  if (studentNumber === null || correctNumber === null) return false;
  return Math.abs(studentNumber - correctNumber) < 1e-9;
}

function normalizeAnswerText(value: number | string | undefined): string {
  return String(value ?? "")
    .trim()
    .replaceAll(",", "")
    .replace(/\s+/g, "");
}

function parseAnswerNumber(value: string): number | null {
  if (/^[-+]?\d+\/\d+$/.test(value)) {
    const [numerator, denominator] = value.split("/").map(Number);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type FullTestDifficulty = "standard" | "lower";

/**
 * Routes to one of the Full Test's two fixed 22-question banks, exactly
 * like the original app: Standard difficulty is problem_id 1-22 (labeled
 * "Module 1"), Lower difficulty is problem_id 23-44 ("Module 2 LD"). This
 * is a fixed, non-randomized set — same questions, same order, every time.
 */
export function selectFullTestBank(questions: Question[], difficulty: FullTestDifficulty): Question[] {
  const [min, max] = difficulty === "lower" ? [23, 44] : [1, 22];
  return questions
    .filter((question) => question.problemId !== null && question.problemId >= min && question.problemId <= max)
    .sort((a, b) => (a.problemId ?? 0) - (b.problemId ?? 0));
}
