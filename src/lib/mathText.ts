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

/** Applies mathify-style substitutions used for question prompts and choices. */
export function mathifyPrompt(value: string | null | undefined): string {
  const text = stripHtml(value);
  return text
    .replace(/\bpi\b/gi, "π")
    .replace(/\bsqrt\b/gi, "√")
    .replace(/\*/g, " · ");
}
