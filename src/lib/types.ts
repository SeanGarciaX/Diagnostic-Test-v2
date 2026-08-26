// Shared types used across the app. Keeping them in one file makes it easy
// to see the whole shape of the data at a glance.

export type Domain =
  | "Algebra"
  | "Advanced Math"
  | "Problem-Solving and Data Analysis"
  | "Geometry and Trigonometry";

export type Confidence = "Unsure" | "Okay" | "Confident";

/** A single SAT Math question, already normalized from the raw database row. */
export type Question = {
  id: string; // problem_id from the database, always a string here
  problemId: number | null; // numeric form, used to route the Full Test's question banks
  prompt: string; // question text, ready for MathJax rendering
  choices: string[]; // empty array for a student-response question
  correctIndex: number | null; // null for a student-response question
  correctValue: string | null; // the accepted answer for a student-response question
  domain: Domain;
  topic: string;
  difficulty: string;
  imageUrl: string | null;
  solution: QuestionSolution;
};

/** Step-by-step explanation shown after a question is answered. */
export type QuestionSolution = {
  available: boolean;
  finalAnswer: string;
  concept: string;
  strategy: string;
  steps: SolutionStep[];
  commonMistake: string | null;
  satTip: string | null;
  remember: string | null;
};

export type SolutionStep = {
  title: string;
  explanation: string;
  keywords: string[];
  mathLines: string[];
  workLines: string[];
  rule: string | null;
  why: string | null;
  formula: string | null;
  formulaName: string | null;
  diagram: GeometryDiagram | null;
};

/** Structured data for the auto-generated SVG diagrams in the solution review. */
export type GeometryDiagram = {
  type: "triangle" | "right_triangle" | "circle" | "coordinate_plane";
  rightAngle?: boolean;
  labels?: Record<string, string>;
  sideLabels?: Record<string, string>;
  radius?: string;
  radiusLabel?: string;
  points?: { x: number; y: number; label?: string }[];
};

/** One answered question, as recorded to (and read back from) `attempts`. */
export type Attempt = {
  id: string;
  problemId: string;
  domain: Domain;
  topic: string;
  difficulty: string;
  correct: boolean;
  hintUsed: boolean;
  confidence: Confidence;
  timeSeconds: number | null;
  answeredAt: string;
};

/** Aggregated performance for one domain/topic pair, from `mastery_by_topic`. */
export type TopicMastery = {
  domain: Domain;
  topic: string;
  attempts: number;
  correct: number;
  accuracy: number; // 0-100
  lastPracticedAt: string;
};

export type StudentProfile = {
  id: string;
  displayName: string;
  targetScore: number;
  dailyQuestionGoal: number;
  theme: ThemeId;
};

export type ThemeId = "classic" | "coastal" | "graphite";
