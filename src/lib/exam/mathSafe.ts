// A defensive math-rendering layer, ported from the original Diagnostic-
// Test app's Orbit.py (its normalizeLatex/readableMathFallback/etc.
// functions). The idea: solution content comes from a database column
// authored by a person, so it can occasionally contain malformed LaTeX
// (unbalanced braces, stray HTML). Rather than let that crash MathJax or
// show broken raw LaTeX to a student mid-test, this validates the LaTeX
// first and falls back to a readable Unicode approximation when it isn't
// safe to hand to MathJax.

/** Strips \(\), \[\], $$, and normalizes common symbols so MathJax gets clean TeX. */
export function normalizeLatex(value: string | null | undefined): string {
  let s = String(value ?? "").trim();
  while (s.includes("\\\\")) s = s.replaceAll("\\\\", "\\");
  s = s
    .replaceAll("\\(", "")
    .replaceAll("\\)", "")
    .replaceAll("\\[", "")
    .replaceAll("\\]", "")
    .replaceAll("$$", "")
    .replaceAll("$", "")
    .replaceAll("\\left", "")
    .replaceAll("\\right", "");
  s = s
    .replaceAll("≤", "\\leq")
    .replaceAll("≥", "\\geq")
    .replaceAll("×", "\\times")
    .replaceAll("÷", "\\div")
    .replaceAll("°", "^\\circ");
  return s.trim();
}

/** True only if braces are balanced and there's no stray HTML — the bar for trusting MathJax with it. */
export function mathStructurallySafe(value: string | null | undefined): boolean {
  const s = String(value ?? "");
  let depth = 0;
  for (const ch of s) {
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0 && !/<[A-Za-z/][^>]*>/.test(s);
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  "+": "⁺"
};

const LATEX_SYMBOL_MAP: Record<string, string> = {
  "\\mu": "μ",
  "\\angle": "∠",
  "\\circ": "°",
  "\\leq": "≤",
  "\\geq": "≥",
  "\\times": "×",
  "\\div": "÷",
  "\\pm": "±",
  "\\neq": "≠",
  "\\approx": "≈",
  "\\pi": "π",
  "\\theta": "θ",
  "\\cdot": "·",
  "\\rightarrow": "→",
  "\\to": "→",
  "\\Delta": "Δ"
};

/** Converts LaTeX to a readable plain-text approximation, for when MathJax can't be trusted with it. */
export function readableMathFallback(value: string | null | undefined): string {
  let s = normalizeLatex(value);
  s = s.replaceAll("^\\circ", "°");
  s = s
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\mathrm\{([^{}]+)\}/g, "$1")
    .replace(/\\text\{([^{}]+)\}/g, "$1");

  s = s.replace(/\^\{(-?\d+)\}/g, (_, digits: string) => [...digits].map((ch) => SUPERSCRIPT_DIGITS[ch] ?? ch).join(""));
  s = s.replace(/\^(-?\d+)/g, (_, digits: string) => [...digits].map((ch) => SUPERSCRIPT_DIGITS[ch] ?? ch).join(""));

  for (const [latex, symbol] of Object.entries(LATEX_SYMBOL_MAP)) {
    s = s.replaceAll(latex, symbol);
  }

  return s
    .replace(/\\[A-Za-z]+/g, "")
    .replace(/[{}]/g, "")
    .trim();
}

/** Rough check for whether a string is worth sending through MathJax at all. */
export function containsLatex(value: string | null | undefined): boolean {
  const s = normalizeLatex(value);
  return s.includes("\\") || s.includes("^") || s.includes("_") || /[=<>+\-*/|]/.test(s);
}

// --- Answer-text classification, ported from the original app's setSafeAnswer() ---
//
// A stored "correct answer" isn't always pure math. Sending an entire
// mixed string like "4,995 kg per second" through MathJax collapses all
// its spaces (math mode ignores literal whitespace between plain words),
// producing "4,995kgpersecond". The original app avoided this by
// classifying the answer first and only sending the actually-mathematical
// part through MathJax. planAnswerRender() is that same classification,
// pulled out as a plain function so it's unit-testable — SafeAnswerText.tsx
// just renders whatever plan this returns.

export type AnswerRenderPlan =
  | { kind: "empty"; letter: string }
  | { kind: "number-then-words"; letter: string; number: string; words: string }
  | { kind: "math"; letter: string; body: string }
  | { kind: "prose"; letter: string; body: string };

const LETTER_PREFIX = /^([ABCD])\.\s*(.*)$/;
const NUMBER_THEN_WORDS = /^([-+]?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?)\s+(.+)$/;
const HAS_TEX_COMMAND = /\\[A-Za-z]+/;
const HAS_MATH_STRUCTURE = /[=<>≤≥≠≈∠√^_]/;
const HAS_FRACTION = /\d+\s*\/\s*\d+/;

export function planAnswerRender(value: string): AnswerRenderPlan {
  const raw = value.trim();
  const letterMatch = raw.match(LETTER_PREFIX);
  const letter = letterMatch?.[1] ?? "";
  const body = (letterMatch?.[2] ?? raw).trim();

  if (!body) return { kind: "empty", letter };

  const hasTexCommand = HAS_TEX_COMMAND.test(body);
  const numberThenWords = !hasTexCommand ? body.match(NUMBER_THEN_WORDS) : null;
  if (numberThenWords) return { kind: "number-then-words", letter, number: numberThenWords[1], words: numberThenWords[2] };

  const looksLikeMath = hasTexCommand || HAS_MATH_STRUCTURE.test(body) || HAS_FRACTION.test(body);
  return looksLikeMath ? { kind: "math", letter, body } : { kind: "prose", letter, body };
}
