"use client";

// The Full Test's start screen. Matches the original app's two working
// choices (difficulty bank, timing accommodation) — the visibly-disabled
// decoy options it also showed (a "Full 44-question" length, other
// practice tests, "High" difficulty) were never actually selectable, so
// they're left out here rather than recreated as dead UI.

import { useState } from "react";
import type { FullTestDifficulty } from "@/lib/questions";
import styles from "./exam.module.css";

export type Accommodation = "standard" | "1.5x" | "2.0x";

const ACCOMMODATION_MINUTES: Record<Accommodation, number> = { standard: 35, "1.5x": 53, "2.0x": 70 };

export function ExamConfigScreen({
  onBegin
}: {
  onBegin: (config: { difficulty: FullTestDifficulty; accommodation: Accommodation; moduleMinutes: number }) => void;
}) {
  const [difficulty, setDifficulty] = useState<FullTestDifficulty>("standard");
  const [accommodation, setAccommodation] = useState<Accommodation>("standard");

  return (
    <div className={styles.startOverlay}>
      <div className={styles.startCard}>
        <div className={styles.startTitle}>SAT Math Practice Exam</div>
        <div className={styles.startSub}>
          Choose your difficulty and testing accommodations. The timer will begin only after you click{" "}
          <strong>Begin Practice Exam</strong>.
        </div>

        <div className={styles.startGroup}>
          <label className={styles.startLabel} htmlFor="difficulty-select">
            Difficulty
          </label>
          <select
            id="difficulty-select"
            className={styles.startSelect}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as FullTestDifficulty)}
          >
            <option value="standard">Standard difficulty</option>
            <option value="lower">Lower difficulty</option>
          </select>
          <div className={styles.startNote}>
            {difficulty === "lower" ? "Lower Difficulty uses Practice Test #4 problems 23–44." : "Standard Difficulty uses Practice Test #4 problems 1–22."}
          </div>
        </div>

        <div className={styles.startGroup}>
          <label className={styles.startLabel} htmlFor="accommodation-select">
            Testing accommodations
          </label>
          <select
            id="accommodation-select"
            className={styles.startSelect}
            value={accommodation}
            onChange={(e) => setAccommodation(e.target.value as Accommodation)}
          >
            <option value="standard">Standard time — 35 minutes</option>
            <option value="1.5x">1.5× time — 53 minutes</option>
            <option value="2.0x">2.0× time — 70 minutes</option>
          </select>
        </div>

        <button
          className={styles.beginBtn}
          onClick={() => onBegin({ difficulty, accommodation, moduleMinutes: ACCOMMODATION_MINUTES[accommodation] })}
        >
          Begin Practice Exam
        </button>
      </div>
    </div>
  );
}
