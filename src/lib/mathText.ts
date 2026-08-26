// Turns the plain text stored in the database into text MathJax can render
// correctly. This is a simplified, readable port of the regex pipeline in
// the original Diagnostic-Test app's Orbit.py (_normalize_math_for_mathjax
// and friends). The original handled many more edge cases for mixing prose
// into equations; this version covers the common ones and is much easier
// to follow and extend.

/** Removes any HTML tags a database field might contain, keeping the text. */
export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Normalizes a stored math expression into MathJax-friendly TeX:
 * common symbols, `a/b` fractions, `x^2` exponents, and degree signs.
 * Leaves already-valid TeX (anything with a backslash command) alone.
 */
export function normalizeMath(value: string | null | undefined): string {
  let text = stripHtml(value);
  if (!text) return "";

  text = text
    .replace(/≤/g, "\\leq")
    .replace(/≥/g, "\\geq")
    .replace(/≠/g, "\\neq")
    .replace(/≈/g, "\\approx")
    .replace(/×/g, "\\cdot")
    .replace(/÷/g, "\\div")
    .replace(/°/g, "^\\circ");

  // a/b -> \frac{a}{b}, but leave existing \frac{...} commands untouched.
  text = text.replace(/(?<![\\A-Za-z0-9}])(-?\d+(?:\.\d+)?|[A-Za-z]\w*)\s*\/\s*(-?\d+(?:\.\d+)?|[A-Za-z]\w*)/g, "\\frac{$1}{$2}");

  // x^2, x^-1, x^(2n) -> proper TeX superscripts.
  text = text.replace(/\^\((.+?)\)/g, "^{$1}");
  text = text.replace(/\^(-?\d+)(?!\})/g, "^{$1}");

  return text.replace(/\s+/g, " ").trim();
}

const EXPONENT_DIGIT_MAP: Record<string, string> = {
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
  "-": "⁻"
};

/**
 * Applies the same substitutions as the original app's `mathify()`: this
 * is deliberately NOT MathJax/TeX conversion. Question prompts and answer
 * choices in the original are never sent through MathJax at all — they're
 * shown as plain Unicode math text (π, √, x²), which is what this
 * produces. MathJax is reserved for the step-by-step solution review
 * panel (see SafeMathText.tsx), where the stored content actually is TeX.
 */
export function mathifyPrompt(value: string | null | undefined): string {
  const text = stripHtml(value);
  return text
    .replace(/\bpi\b/gi, "π")
    .replace(/\bsqrt\b/gi, "√")
    .replace(/\*/g, " · ")
    .replace(/\^(-?\d+)/g, (_, digits: string) => [...digits].map((ch) => EXPONENT_DIGIT_MAP[ch] ?? ch).join(""));
}
