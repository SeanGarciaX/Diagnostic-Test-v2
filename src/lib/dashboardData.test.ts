import { describe, expect, it } from "vitest";
import {
  accuracyPercent,
  currentStreak,
  dailyRowFor,
  formatDuration,
  hasIdentity,
  lastNDayKeys,
  sumDailyWindow,
  todayKey,
  type DailyStat
} from "./dashboardData";

describe("hasIdentity", () => {
  it("is true for a guest id, a user id, or both", () => {
    expect(hasIdentity({ userId: null, guestId: "g1" })).toBe(true);
    expect(hasIdentity({ userId: "u1", guestId: null })).toBe(true);
  });

  it("is false when neither is set", () => {
    expect(hasIdentity({ userId: null, guestId: null })).toBe(false);
  });
});

describe("accuracyPercent", () => {
  it("returns null with zero attempts rather than dividing by zero", () => {
    expect(accuracyPercent(0, 0)).toBeNull();
  });

  it("rounds to the nearest percent", () => {
    expect(accuracyPercent(1, 3)).toBe(33);
    expect(accuracyPercent(2, 3)).toBe(67);
  });
});

describe("formatDuration", () => {
  it("formats seconds only under a minute", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats whole minutes without a seconds part", () => {
    expect(formatDuration(120)).toBe("2m");
  });

  it("formats minutes and seconds together", () => {
    expect(formatDuration(84)).toBe("1m 24s");
  });

  it("floors at 0s for zero or negative input", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(-5)).toBe("0s");
  });
});

describe("dailyRowFor", () => {
  const daily: DailyStat[] = [{ day: "2026-08-20", attempts: 5, correct: 4, activeSeconds: 300 }];

  it("returns the matching row", () => {
    expect(dailyRowFor(daily, "2026-08-20")).toEqual(daily[0]);
  });

  it("returns a zeroed row for a day with no data instead of undefined", () => {
    expect(dailyRowFor(daily, "2026-08-21")).toEqual({ day: "2026-08-21", attempts: 0, correct: 0, activeSeconds: 0 });
  });
});

describe("sumDailyWindow", () => {
  const now = new Date("2026-08-27T12:00:00Z");
  const daily: DailyStat[] = [
    { day: "2026-08-27", attempts: 3, correct: 2, activeSeconds: 100 },
    { day: "2026-08-26", attempts: 2, correct: 2, activeSeconds: 80 },
    { day: "2026-08-15", attempts: 10, correct: 1, activeSeconds: 500 } // well outside a 7-day window
  ];

  it("only sums rows within the requested trailing window", () => {
    const week = sumDailyWindow(daily, 6, now);
    expect(week).toEqual({ attempts: 5, correct: 4, activeSeconds: 180 });
  });
});

describe("currentStreak", () => {
  const now = new Date("2026-08-27T12:00:00Z");

  it("counts consecutive practiced days ending today", () => {
    const daily: DailyStat[] = [
      { day: "2026-08-27", attempts: 1, correct: 1, activeSeconds: 10 },
      { day: "2026-08-26", attempts: 1, correct: 0, activeSeconds: 10 },
      { day: "2026-08-25", attempts: 1, correct: 1, activeSeconds: 10 }
    ];
    expect(currentStreak(daily, now)).toBe(3);
  });

  it("doesn't reset to 0 just because today hasn't been practiced yet", () => {
    const daily: DailyStat[] = [
      { day: "2026-08-26", attempts: 1, correct: 1, activeSeconds: 10 },
      { day: "2026-08-25", attempts: 1, correct: 1, activeSeconds: 10 }
    ];
    expect(currentStreak(daily, now)).toBe(2);
  });

  it("breaks on a missed day", () => {
    const daily: DailyStat[] = [
      { day: "2026-08-27", attempts: 1, correct: 1, activeSeconds: 10 },
      { day: "2026-08-25", attempts: 1, correct: 1, activeSeconds: 10 }
    ];
    expect(currentStreak(daily, now)).toBe(1);
  });

  it("is 0 with no practice at all", () => {
    expect(currentStreak([], now)).toBe(0);
  });
});

describe("todayKey / lastNDayKeys", () => {
  const now = new Date("2026-08-27T12:00:00Z");

  it("returns the UTC day key", () => {
    expect(todayKey(now)).toBe("2026-08-27");
  });

  it("returns the last N days ending today, oldest first", () => {
    expect(lastNDayKeys(3, now)).toEqual(["2026-08-25", "2026-08-26", "2026-08-27"]);
  });
});
