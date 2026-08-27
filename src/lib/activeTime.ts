"use client";

// Estimates ACTIVE question-solving time instead of raw wall-clock elapsed
// time (submission timestamp - start timestamp), per the analytics spec.
//
// TIMING RULE (documented here on purpose — this is the one place it's
// implemented): time is excluded from the count for two reasons —
//   1. The tab isn't visible, or the window isn't focused (covers
//      switching tabs, minimizing, or leaving the browser entirely).
//   2. No mouse/keyboard/scroll/touch activity for IDLE_THRESHOLD_MS
//      while the tab IS still visible and focused (covers stepping away
//      from an open, focused tab — visibility alone can't catch that).
// Everything else counts as active. This is a heuristic estimate, not a
// guarantee — it can't distinguish "reading the question carefully" from
// "staring off," so it only ever excludes clearly-idle stretches.

import { useEffect, useRef } from "react";

export const IDLE_THRESHOLD_MS = 90_000;

/** Pure arithmetic, pulled out of the hook below so it's unit-testable without a DOM (see activeTime.test.ts). */
export function activeSecondsFromRaw(rawMs: number, pausedMs: number): number {
  return Math.max(0, Math.round((rawMs - pausedMs) / 1000));
}

function isPageActiveNow(): boolean {
  return typeof document !== "undefined" && !document.hidden && document.hasFocus();
}

/**
 * Tracks pause/idle spans for as long as the calling component is mounted.
 * Call `activeSecondsBetween(fromMs, toMs)` to get the active-time estimate
 * for any interval inside that lifetime (both simple single-timer usage and
 * a longer session split across multiple sub-timers, e.g. one per question
 * in a multi-question exam).
 */
export function useActiveTimeTracker() {
  const pausedMsRef = useRef(0);
  const pauseStartRef = useRef<number | null>(isPageActiveNow() ? null : Date.now());
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const pause = () => {
      if (pauseStartRef.current === null) pauseStartRef.current = Date.now();
    };
    const resume = () => {
      if (pauseStartRef.current !== null) {
        pausedMsRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }
      lastActivityRef.current = Date.now();
    };
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const onVisibility = () => (document.hidden ? pause() : resume());

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    window.addEventListener("scroll", markActivity, { passive: true });
    window.addEventListener("touchstart", markActivity, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("scroll", markActivity);
      window.removeEventListener("touchstart", markActivity);
    };
  }, []);

  /** Total paused-or-idle ms accumulated from tracker creation through `now`. Monotonically non-decreasing, so subtracting two calls gives the paused time inside that interval. */
  function pausedMsThrough(now: number): number {
    let paused = pausedMsRef.current;
    if (pauseStartRef.current !== null) paused += Math.max(0, now - pauseStartRef.current);

    const idleFor = now - lastActivityRef.current;
    if (pauseStartRef.current === null && idleFor > IDLE_THRESHOLD_MS) {
      paused += idleFor - IDLE_THRESHOLD_MS;
    }
    return paused;
  }

  /** Active seconds between two wall-clock timestamps (ms), excluding paused/idle time in that window. */
  function activeSecondsBetween(fromMs: number, toMs: number): number {
    if (toMs <= fromMs) return 0;
    const raw = toMs - fromMs;
    const pausedDuring = pausedMsThrough(toMs) - pausedMsThrough(fromMs);
    return activeSecondsFromRaw(raw, pausedDuring);
  }

  return { activeSecondsBetween };
}
