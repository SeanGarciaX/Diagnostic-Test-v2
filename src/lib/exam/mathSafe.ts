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
