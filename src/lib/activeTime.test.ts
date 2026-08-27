import { describe, expect, it } from "vitest";
import { activeSecondsFromRaw } from "./activeTime";

describe("activeSecondsFromRaw", () => {
  it("subtracts paused time from the raw elapsed time", () => {
    expect(activeSecondsFromRaw(60_000, 20_000)).toBe(40);
  });

  it("never goes negative even if paused exceeds raw (clock skew / rounding)", () => {
    expect(activeSecondsFromRaw(10_000, 15_000)).toBe(0);
  });

  it("rounds to the nearest second", () => {
    expect(activeSecondsFromRaw(1_400, 0)).toBe(1);
    expect(activeSecondsFromRaw(1_600, 0)).toBe(2);
  });

  it("returns 0 for no elapsed time", () => {
    expect(activeSecondsFromRaw(0, 0)).toBe(0);
  });
});
