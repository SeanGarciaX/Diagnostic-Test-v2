import { describe, expect, it } from "vitest";
import { containsLatex, mathStructurallySafe, planAnswerRender, readableMathFallback } from "./mathSafe";

// These mirror the original app's own inline sanitizerSelfTest() assertions.
describe("mathSafe", () => {
  it("converts \\mu to a readable Unicode symbol", () => {
    expect(readableMathFallback("\\mu_X < \\mu_Y")).toContain("μ");
  });

  it("converts \\angle and \\circ to readable Unicode symbols", () => {
    expect(readableMathFallback("\\angle P=72^\\circ")).toContain("∠");
  });

  it("accepts balanced braces as structurally safe", () => {
    expect(mathStructurallySafe("(xy)^{\\frac{9}{7}}")).toBe(true);
  });

  it("rejects unbalanced braces", () => {
    expect(mathStructurallySafe("(xy)^{\\frac{9}{7}")).toBe(false);
  });

  it("rejects embedded HTML tags", () => {
    expect(mathStructurallySafe("<script>alert(1)</script>")).toBe(false);
  });

  it("converts a fraction and exponent to a plain-text approximation", () => {
    expect(readableMathFallback("\\frac{1}{2}x^{2}")).toBe("(1)/(2)x²");
  });

  it("flags plain prose as not containing LaTeX", () => {
    expect(containsLatex("The mean of the data set")).toBe(false);
  });

  it("flags an equation as containing LaTeX-like structure", () => {
    expect(containsLatex("x = 5")).toBe(true);
  });
});

describe("planAnswerRender", () => {
  it("splits a number-plus-units answer so only the number goes through MathJax", () => {
    expect(planAnswerRender("A. 4,995 kg per second")).toEqual({
      kind: "number-then-words",
      letter: "A",
      number: "4,995",
      words: "kg per second"
    });
  });

  it("treats a pure-prose answer as plain text, not math", () => {
    expect(planAnswerRender("D. The estimated number of catalogs sent at the end of 1992 was 9,000.")).toEqual({
      kind: "prose",
      letter: "D",
      body: "The estimated number of catalogs sent at the end of 1992 was 9,000."
    });
  });

  it("treats a pure math expression as math", () => {
    expect(planAnswerRender("C. x = y/77b")).toEqual({ kind: "math", letter: "C", body: "x = y/77b" });
  });

  it("treats a bare value with no math operators or trailing words as plain text", () => {
    // No space between the number and "°" means it isn't "number-then-words"
    // either — and with no =, <, >, ^, etc. it isn't detected as math, which
    // is fine here since "72°" displays correctly as plain text either way.
    expect(planAnswerRender("B. 72°")).toEqual({ kind: "prose", letter: "B", body: "72°" });
  });

  it("treats a number directly followed by an operator as math, not number-then-words", () => {
    expect(planAnswerRender("B. x = 72")).toEqual({ kind: "math", letter: "B", body: "x = 72" });
  });

  it("handles an answer with no letter prefix", () => {
    // A bare number with no operator or units renders identically as
    // plain text or as math — either way there's nothing for MathJax to
    // typeset — so "prose" here is fine, not just "math".
    expect(planAnswerRender("13")).toEqual({ kind: "prose", letter: "", body: "13" });
  });

  it("handles an empty answer", () => {
    expect(planAnswerRender("")).toEqual({ kind: "empty", letter: "" });
    expect(planAnswerRender("A.")).toEqual({ kind: "empty", letter: "A" });
  });
});
