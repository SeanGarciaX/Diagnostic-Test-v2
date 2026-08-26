import { describe, expect, it } from "vitest";
import { mathifyPrompt, normalizeMath, stripHtml } from "./mathText";

describe("stripHtml", () => {
  it("removes tags but keeps text", () => {
    expect(stripHtml("<p>Solve <b>x</b></p>")).toBe("Solve x");
  });

  it("removes script and style blocks entirely", () => {
    expect(stripHtml("<script>alert(1)</script>Safe text")).toBe("Safe text");
  });

  it("returns an empty string for null or undefined", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
  });
});

describe("normalizeMath", () => {
  it("converts a simple fraction to TeX", () => {
    expect(normalizeMath("1/2")).toBe("\\frac{1}{2}");
  });

  it("converts exponents to braced TeX", () => {
    expect(normalizeMath("x^2")).toBe("x^{2}");
  });

  it("converts common symbols", () => {
    expect(normalizeMath("x ≤ 5")).toBe("x \\leq 5");
    expect(normalizeMath("30°")).toBe("30^\\circ");
  });
});

describe("mathifyPrompt", () => {
  it("replaces pi and sqrt with symbols", () => {
    expect(mathifyPrompt("pi times sqrt(4)")).toBe("π times √(4)");
  });

  it("converts exponents to Unicode superscripts, not TeX", () => {
    expect(mathifyPrompt("x^2 + y^-1")).toBe("x² + y⁻¹");
  });
});
