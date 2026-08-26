import { describe, expect, it } from "vitest";
import { containsLatex, mathStructurallySafe, readableMathFallback } from "./mathSafe";

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
