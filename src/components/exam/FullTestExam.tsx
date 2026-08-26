"use client";

// The Full Test experience, rebuilt to match the original Diagnostic-Test
// app's Orbit.py feature-for-feature: a difficulty/accommodation config
// screen, a fixed 22-question bank (Standard = problem_id 1-22, Lower =
// problem_id 23-44 — the same two banks, same order, every time), the
// full Bluebook-style exam shell (timer, dark mode, expand, mark for
// review, eliminate choice, question navigator, calculator, reference
// sheet, directions), a celebration animation on manual finish vs. a
// plain results screen on timeout, and the step-by-step solution review.
//
// The one deliberate behavior change from the original: results are tied
// to the signed-in student's account and saved to their progress, instead
// of being hardcoded to "Sean Garcia" and never saved anywhere.

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { isAnswerCorrect, selectFullTestBank, type FullTestDifficulty } from "@/lib/questions";
import { completeSession, markMissedForReview, recordAttempt, startSession } from "@/lib/attempts";
import { formatPromptHtml } from "@/lib/mathText";
import type { Question } from "@/lib/types";
import { ProblemHtml } from "@/components/ProblemHtml";
import { ExamConfigScreen, type Accommodation } from "./ExamConfigScreen";
import { DirectionsModal } from "./DirectionsModal";
import { ReferenceSheetModal } from "./ReferenceSheetModal";
import { DesmosCalculator } from "./DesmosCalculator";
import { QuestionNavigatorPopover } from "./QuestionNavigatorPopover";
import { CelebrationAnimation } from "./CelebrationAnimation";
import { StepSolutionReview } from "./StepSolutionReview";
import styles from "./exam.module.css";

const DESMOS_SCRIPT_URL = "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

type Phase = "config" | "active" | "results" | "reviewing";
type ResultsView = "plain" | "animation";

export function FullTestExam({
  userId,
  studentName,
  allQuestions,
  onSaved
}: {
  userId: string | null;
  studentName: string;
  allQuestions: Question[];
  onSaved?: () => void;
}) {
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("config");
  const [resultsView, setResultsView] = useState<ResultsView>("plain");
  const [bank, setBank] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [eliminated, setEliminated] = useState<Set<number>[]>([]);
  const [marked, setMarked] = useState<boolean[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerHidden, setTimerHidden] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);

  const sessionIdRef = useRef<Promise<string> | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (phase !== "active") return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          finish("timeout");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const begin = (config: { difficulty: FullTestDifficulty; accommodation: Accommodation; moduleMinutes: number }) => {
    const selected = selectFullTestBank(allQuestions, config.difficulty);
    if (selected.length !== 22) {
      alert(`This question bank is incomplete. Expected 22 questions but found ${selected.length}.`);
      return;
    }
    setBank(selected);
    setCurrent(0);
    setAnswers(new Array(22).fill(null));
    setEliminated(selected.map(() => new Set<number>()));
    setMarked(new Array(22).fill(false));
    setSecondsLeft(config.moduleMinutes * 60);
    savedRef.current = false;
    if (userId) sessionIdRef.current = startSession(supabase, userId, "full_test");
    setPhase("active");
  };

  const correctCount = useMemo(() => bank.reduce((sum, q, i) => sum + (isAnswerCorrect(q, answers[i] ?? undefined) ? 1 : 0), 0), [bank, answers]);
  const topicBreakdown = useMemo(() => {
    const tally: Record<string, { correct: number; total: number }> = {};
    bank.forEach((q, i) => {
      const entry = tally[q.topic] ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (isAnswerCorrect(q, answers[i] ?? undefined)) entry.correct += 1;
      tally[q.topic] = entry;
    });
    return tally;
  }, [bank, answers]);

  const finish = async (reason: "timeout" | "manual") => {
    setPhase("results");
    setResultsView(reason === "timeout" ? "plain" : "animation");
    if (savedRef.current || !userId) return;
    savedRef.current = true;

    const sessionId = await sessionIdRef.current;
    if (!sessionId) return;
    for (let i = 0; i < bank.length; i++) {
      const question = bank[i];
      const response = answers[i] ?? undefined;
      const correct = isAnswerCorrect(question, response);
      await recordAttempt(supabase, {
        userId,
        sessionId,
        problemId: question.id,
        domain: question.domain,
        topic: question.topic,
        difficulty: question.difficulty,
        correct,
        selectedAnswer: typeof response === "number" ? question.choices[response] : (response ?? null),
        correctAnswer: question.correctIndex !== null ? question.choices[question.correctIndex] : question.correctValue,
        hintUsed: false,
        confidence: "Okay",
        timeSeconds: null
      });
      if (!correct) await markMissedForReview(supabase, userId, question.id);
    }
    await completeSession(supabase, sessionId, bank.length, correctCount);
    onSaved?.();
  };

  const startReview = () => {
    setCurrent(0);
    setPhase("reviewing");
  };

  const backToResults = () => {
    setResultsView("animation");
    setPhase("results");
  };

  const returnToMainMenu = () => {
    setPhase("config");
  };

  if (phase === "config") {
    return (
      <div className={`${styles.shell} ${expanded ? styles.expanded : ""} ${darkMode ? styles.darkMode : ""}`}>
        <ExamConfigScreen onBegin={begin} />
      </div>
    );
  }

  const question = bank[current];
  const answered = answers.map((value) => value !== null && String(value).trim() !== "");

  return (
    <div className={`${styles.shell} ${expanded ? styles.expanded : ""} ${darkMode ? styles.darkMode : ""}`}>
      <Script src={DESMOS_SCRIPT_URL} strategy="afterInteractive" />

      {phase === "results" && resultsView === "animation" && (
        <CelebrationAnimation score={correctCount} onReviewAnswers={startReview} onReturnToMainMenu={returnToMainMenu} />
      )}

      {directionsOpen && <DirectionsModal onClose={() => setDirectionsOpen(false)} />}
      {referenceOpen && <ReferenceSheetModal onClose={() => setReferenceOpen(false)} />}
      {calculatorOpen && <DesmosCalculator onClose={() => setCalculatorOpen(false)} />}

      <div className={styles.topbar}>
        <div className={styles.row1}>
          <div className={styles.sectionTitle}>
            {question.problemId && question.problemId > 22 ? "Practice Test #4, Module 2 LD" : "Practice Test #4, Module 1"}
          </div>
          <div className={`${styles.timer} ${secondsLeft <= 300 ? styles.low : ""}`} style={{ visibility: timerHidden ? "hidden" : "visible" }}>
            {formatTime(secondsLeft)}
          </div>
          <div className={styles.battery}>100% 🔋</div>
        </div>
        <div className={styles.row2}>
          <div className={styles.directions} onClick={() => setDirectionsOpen(true)}>
            Directions
          </div>
          <button className={styles.hideBtn} onClick={() => setTimerHidden((value) => !value)}>
            {timerHidden ? "Show" : "Hide"}
          </button>
          <div className={styles.tools}>
            <button className={styles.tool} onClick={() => setCalculatorOpen((value) => !value)}>
              <span className={styles.icon}>🖩</span>
              <span>Calculator</span>
            </button>
            <button className={styles.tool} onClick={() => setDarkMode((value) => !value)} title="Toggle dark mode">
              <span className={styles.icon}>◐</span>
              <span>{darkMode ? "White Mode" : "Dark Mode"}</span>
            </button>
            <button className={styles.tool} onClick={() => setReferenceOpen(true)}>
              <span className={styles.icon}>x²</span>
              <span>Reference</span>
            </button>
            <button className={styles.tool} onClick={() => setExpanded((value) => !value)} title={expanded ? "Collapse exam" : "Expand exam"}>
              <span className={styles.icon}>⛶</span>
              <span>{expanded ? "Collapse" : "Expand"}</span>
            </button>
          </div>
        </div>
      </div>
      <div className={styles.ticks} />
      <div className={styles.practiceBanner}>THIS IS A PRACTICE TEST</div>

      {phase === "results" && resultsView === "plain" && (
        <div className={styles.results}>
          <div className={styles.resultsScore}>
            {correctCount} / {bank.length}
          </div>
          <div className={styles.resultsSub}>questions answered correctly</div>
          <div className={styles.resultsBreakdown}>
            {Object.entries(topicBreakdown).map(([topic, tally]) => (
              <div key={topic} className={styles.resultsRow}>
                <span>{topic}</span>
                <span style={{ fontWeight: 700, color: "#14274e" }}>
                  {tally.correct} / {tally.total}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.resultsBtnRow}>
            <button className={styles.reviewBtn} onClick={startReview}>
              Review Answers
            </button>
            <button className={styles.retryBtn} onClick={returnToMainMenu}>
              Return to Main Menu
            </button>
          </div>
        </div>
      )}

      {(phase === "active" || phase === "reviewing") && (
        <div className={`${styles.body} ${phase === "reviewing" ? styles.reviewMode : ""}`}>
          <div className={styles.main}>
            <div className={styles.qcard}>
              <div className={styles.qheader}>
                <div className={styles.qnum}>{current + 1}</div>
                <div
                  className={`${styles.mark} ${marked[current] ? styles.marked : ""}`}
                  style={{ visibility: phase === "reviewing" ? "hidden" : "visible" }}
                  onClick={() => setMarked((values) => values.map((value, i) => (i === current ? !value : value)))}
                >
                  <span>🔖</span>
                  <span>Mark for Review</span>
                </div>
                <div className={styles.abc}>ABC</div>
              </div>
              <div className={styles.qbody}>
                <div className={styles.tagRow}>
                  <span className={styles.tag}>{question.domain}</span>
                  <span className={styles.tag}>{question.topic}</span>
                  <span className={styles.tag}>{question.difficulty}</span>
                </div>
                <div className={styles.prompt}>
                  {/* Prompts are plain Unicode math text (see mathifyPrompt), not TeX. Rendered
                      as real HTML — like the original app — so embedded <img> tags and any
                      formatting markup in the question bank actually show up, not just text. */}
                  <ProblemHtml as="div" html={formatPromptHtml(question.prompt)} />
                  {question.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={question.imageUrl} alt="Question diagram" style={{ maxWidth: "100%", margin: "18px auto 6px", display: "block" }} />
                  )}
                </div>

                {question.choices.length > 0 ? (
                  question.choices.map((choice, i) => {
                    // selectedIndex mirrors the original's `selected` variable — the chosen
                    // choice's index, or null/undefined if nothing was picked.
                    const selectedIndex = typeof answers[current] === "number" ? (answers[current] as number) : null;
                    const isThisChoiceSelected = selectedIndex === i;
                    const reviewClass =
                      phase !== "reviewing"
                        ? ""
                        : selectedIndex !== null
                          ? isThisChoiceSelected
                            ? i === question.correctIndex
                              ? styles.reviewCorrect
                              : styles.reviewIncorrect
                            : selectedIndex !== question.correctIndex && i === question.correctIndex
                              ? styles.reviewRevealCorrect
                              : ""
                          : i === question.correctIndex
                            ? styles.reviewRevealCorrect
                            : "";
                    return (
                      <button
                        key={i}
                        className={`${styles.choice} ${phase === "reviewing" ? styles.reviewLocked : ""} ${isThisChoiceSelected && phase === "active" ? styles.selected : ""} ${eliminated[current]?.has(i) ? styles.eliminated : ""} ${reviewClass}`}
                        onClick={() => phase === "active" && setAnswers((values) => values.map((v, idx) => (idx === current ? i : v)))}
                        disabled={phase === "reviewing"}
                      >
                        <span className={styles.choiceLeft}>
                          <span className={styles.letter}>{String.fromCharCode(65 + i)}</span>
                          <ProblemHtml as="span" className={styles.choiceText} html={choice} />
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={styles.radio} />
                          {phase === "active" && (
                            <span
                              className={`${styles.eliminateBtn} ${eliminated[current]?.has(i) ? styles.active : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEliminated((sets) =>
                                  sets.map((set, idx) => {
                                    if (idx !== current) return set;
                                    const next = new Set(set);
                                    next.has(i) ? next.delete(i) : next.add(i);
                                    return next;
                                  })
                                );
                              }}
                            >
                              Cross out
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Enter your answer:</div>
                    <input
                      className={styles.sprInput}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Answer"
                      value={typeof answers[current] === "string" ? (answers[current] as string) : ""}
                      readOnly={phase === "reviewing"}
                      onChange={(e) => setAnswers((values) => values.map((v, idx) => (idx === current ? e.target.value : v)))}
                    />
                  </div>
                )}

                {phase === "reviewing" && (
                  <div className={`${styles.resultBanner} ${isAnswerCorrect(question, answers[current] ?? undefined) ? styles.correct : styles.incorrect}`} style={{ display: "block", marginTop: 16 }}>
                    {isAnswerCorrect(question, answers[current] ?? undefined)
                      ? "✓ Correct!"
                      : answered[current]
                        ? "✗ Not quite — see the correct answer below."
                        : "✗ Not answered — see the correct answer above."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {phase === "reviewing" && (
            <aside className={styles.solutionPanel}>
              <StepSolutionReview solution={question.solution} questionKey={question.id} />
            </aside>
          )}
        </div>
      )}

      {(phase === "active" || phase === "reviewing") && (
        <div className={styles.bottombar}>
          <div className={styles.student}>{studentName}</div>
          <button
            className={styles.qpill}
            onClick={() => setNavigatorOpen((value) => !value)}
          >
            {phase === "reviewing" ? "Reviewing " : "Question "}
            {current + 1} of {bank.length}
          </button>
          <div className={styles.navActions}>
            <button className={styles.backBtn} disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>
              Back
            </button>
            <button
              className={styles.nextBtn}
              onClick={() => {
                if (phase === "reviewing") {
                  if (current < bank.length - 1) setCurrent((value) => value + 1);
                  else backToResults();
                } else if (current < bank.length - 1) {
                  setCurrent((value) => value + 1);
                } else {
                  finish("manual");
                }
              }}
            >
              {phase === "reviewing" ? (current === bank.length - 1 ? "Back to Score" : "Next") : current === bank.length - 1 ? "Finish Test" : "Next"}
            </button>
          </div>
          {navigatorOpen && (
            <QuestionNavigatorPopover
              title={question.problemId && question.problemId > 22 ? "Practice Test #4, Module 2 LD" : "Practice Test #4, Module 1"}
              count={bank.length}
              current={current}
              answered={answered}
              marked={marked}
              onSelect={(i) => {
                setCurrent(i);
                setNavigatorOpen(false);
              }}
              onClose={() => setNavigatorOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
