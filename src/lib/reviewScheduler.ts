// Spaced-repetition scheduling for missed questions. Ported and cleaned up
// from Orbit-SAT's lib/review-scheduler.ts — same 1/3/7/14-day cadence,
// rewritten for readability. This mirrors the `review_queue` table shape
// in db/migrations/0001_init.sql.

export type ReviewItem = {
  problemId: string;
  reviewStage: number;
  missedAt: string;
  nextReviewAt: string;
  lastReviewedAt: string | null;
};

const DAY_MS = 86_400_000;

// After a miss, a question is reviewed the next day, then 3, 7, and 14
// days later. Answering it correctly at each stage advances to the next
// interval; missing the final stage removes it from the queue entirely
// (it's considered learned).
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14];

export function isDue(item: ReviewItem, now = Date.now()): boolean {
  return new Date(item.nextReviewAt).getTime() <= now;
}

export function dueItems(items: ReviewItem[], now = Date.now()): ReviewItem[] {
  return items
    .filter((item) => isDue(item, now))
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());
}

/** Call when a question is missed (for the first time, or missed again on review). */
export function scheduleAfterMiss(problemId: string, now = Date.now()): ReviewItem {
  return {
    problemId,
    reviewStage: 0,
    missedAt: new Date(now).toISOString(),
    nextReviewAt: new Date(now).toISOString(),
    lastReviewedAt: null
  };
}

/**
 * Call when a review question is answered correctly. Returns the updated
 * item, or `null` if this was the last interval — meaning the question
 * should be removed from the queue.
 */
export function scheduleAfterSuccess(item: ReviewItem, now = Date.now()): ReviewItem | null {
  const nextStage = item.reviewStage + 1;
  if (nextStage > REVIEW_INTERVALS_DAYS.length) return null;

  const intervalDays = REVIEW_INTERVALS_DAYS[nextStage - 1];
  return {
    ...item,
    reviewStage: nextStage,
    lastReviewedAt: new Date(now).toISOString(),
    nextReviewAt: new Date(now + intervalDays * DAY_MS).toISOString()
  };
}

export function reviewLabel(item: ReviewItem, now = Date.now()): string {
  if (isDue(item, now)) return "Due now";
  const days = Math.max(1, Math.ceil((new Date(item.nextReviewAt).getTime() - now) / DAY_MS));
  return days === 1 ? "Tomorrow" : `In ${days} days`;
}
