import { describe, expect, it } from "vitest";
import { applyGuestSettings, parseGuestSettingsCookie } from "./guestSettings";
import type { StudentProfile } from "./types";

const BASE: StudentProfile = {
  id: "guest",
  displayName: "Guest",
  targetScore: 750,
  dailyQuestionGoal: 5,
  theme: "classic"
};

describe("parseGuestSettingsCookie", () => {
  it("returns an empty patch for a missing or malformed cookie", () => {
    expect(parseGuestSettingsCookie(undefined)).toEqual({});
    expect(parseGuestSettingsCookie("not json")).toEqual({});
  });

  it("parses a valid saved settings cookie", () => {
    const raw = JSON.stringify({ displayName: "Alex", targetScore: 700, dailyQuestionGoal: 10, theme: "coastal" });
    expect(parseGuestSettingsCookie(raw)).toEqual({ displayName: "Alex", targetScore: 700, dailyQuestionGoal: 10, theme: "coastal" });
  });

  it("drops an unknown theme id instead of trusting it blindly", () => {
    const raw = JSON.stringify({ theme: "not-a-real-theme" });
    expect(parseGuestSettingsCookie(raw)).toEqual({});
  });

  it("clamps out-of-range numbers instead of accepting them as-is", () => {
    const raw = JSON.stringify({ targetScore: 99999, dailyQuestionGoal: -5 });
    const parsed = parseGuestSettingsCookie(raw);
    expect(parsed.targetScore).toBe(800);
    expect(parsed.dailyQuestionGoal).toBe(1);
  });
});

describe("applyGuestSettings", () => {
  it("leaves the base profile untouched when there's nothing saved", () => {
    expect(applyGuestSettings(BASE, {})).toEqual(BASE);
  });

  it("overlays only the fields that were actually saved", () => {
    const result = applyGuestSettings(BASE, { theme: "graphite" });
    expect(result.theme).toBe("graphite");
    expect(result.displayName).toBe("Guest");
    expect(result.id).toBe("guest");
  });
});
