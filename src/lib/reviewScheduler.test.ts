import { describe, expect, it } from "vitest";
import { dueItems, isDue, reviewLabel, scheduleAfterMiss, scheduleAfterSuccess } from "./reviewScheduler";

describe("reviewScheduler", () => {
  const start = Date.UTC(2026, 0, 1);

  it("marks a freshly missed question as due immediately", () => {
    const missed = scheduleAfterMiss("q1", start);
    expect(isDue(missed, start)).toBe(true);
  });

  it("advances through the 1/3/7/14-day cadence and then graduates", () => {
    let item = scheduleAfterMiss("q1", start);
    const expectedDays = [1, 3, 7, 14];

    for (const days of expectedDays) {
      const advanced = scheduleAfterSuccess(item, start);
      expect(advanced).not.toBeNull();
      const actualDays = (new Date(advanced!.nextReviewAt).getTime() - start) / 86_400_000;
      expect(actualDays).toBe(days);
      item = advanced!;
    }

    expect(scheduleAfterSuccess(item, start)).toBeNull();
  });

  it("filters and sorts due items by how overdue they are", () => {
    const soon = { ...scheduleAfterMiss("a", start), nextReviewAt: new Date(start - 1000).toISOString() };
    const later = { ...scheduleAfterMiss("b", start), nextReviewAt: new Date(start + 1000).toISOString() };
    const overdue = { ...scheduleAfterMiss("c", start), nextReviewAt: new Date(start - 5000).toISOString() };

    const due = dueItems([soon, later, overdue], start);
    expect(due.map((item) => item.problemId)).toEqual(["c", "a"]);
  });

  it("describes an item due tomorrow", () => {
    const item = scheduleAfterSuccess(scheduleAfterMiss("q1", start), start)!;
    expect(reviewLabel(item, start)).toBe("Tomorrow");
  });
});
