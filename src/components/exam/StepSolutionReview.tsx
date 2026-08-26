"use client";

// The step-by-step "AI Solution Review" panel shown in review mode: one
// step at a time (formula, work, rule, why-this-works, diagram), with
// Previous/Next buttons, arrow-key stepping, and a common-mistake/SAT-tip/
// remember callout on the final step. Ported from the original app's
// renderAiSolution and its helpers.

import { useEffect, useState } from "react";
import type { QuestionSolution } from "@/lib/types";
import { SafeMathText } from "./SafeMathText";
import { SafeAnswerText } from "./SafeAnswerText";
import { GeometryDiagram } from "./GeometryDiagram";
import styles from "./exam.module.css";

const MAX_STEPS = 7;

export function StepSolutionReview({ solution, questionKey }: { solution: QuestionSolution; questionKey: string }) {
  // The parent keys this whole component by question id (see
  // FullTestExam.tsx), so a fresh instance — starting back at step 0 — is
  // exactly what mounts whenever a different question is being reviewed.
  const [stepIndex, setStepIndex] = useState(0);

  const total = Math.min(solution.steps.length, MAX_STEPS);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      if (event.key === "ArrowRight" && stepIndex < total - 1) {
        setStepIndex((value) => value + 1);
        event.preventDefault();
      } else if (event.key === "ArrowLeft" && stepIndex > 0) {
        setStepIndex((value) => value - 1);
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [stepIndex, total]);

  if (!solution.available || total === 0) {
    return (
      <div className={styles.unavailable}>
        <strong>Solution unavailable.</strong>
        <br />
        The solution has not yet been added for this question.
      </div>
    );
  }

  const step = solution.steps[Math.min(stepIndex, total - 1)];
  const isFinalStep = stepIndex === total - 1;

  return (
    <div className={styles.reviewCard}>
      <div className={styles.solutionEyebrow}>Solution Review</div>
      <div className={styles.solutionTitle}>Step-by-Step Solution</div>
      <div className={styles.solutionSub}>Work through one step at a time. Review the verified solution one step at a time.</div>

      {solution.finalAnswer && (
        <div className={styles.answerCard} key={questionKey}>
          <div className={styles.answerLabel}>Correct Answer</div>
          <div className={styles.answerValue}>
            <SafeAnswerText value={solution.finalAnswer} />
          </div>
        </div>
      )}

      {solution.concept && <div className={styles.conceptChip}>{solution.concept}</div>}
      {solution.strategy && (
        <div className={styles.strategyBox}>
          <span className={styles.strategyLabel}>Strategy</span>
          {solution.strategy}
        </div>
      )}

      {/* Keyed by question + step so React fully remounts this subtree on every
          step/question change, instead of reusing the same DOM nodes (and
          whatever MathJax rendering state they're mid-way through) for
          different content. */}
      <div className={styles.solutionStep} key={`${questionKey}-${stepIndex}`}>
        <div className={styles.stepNumber}>{stepIndex + 1}</div>
        <div>
          <div className={styles.stepLabel}>{step.title || `Step ${stepIndex + 1}`}</div>
          <div className={styles.stepText}>{renderKeywordHighlighted(step.explanation, step.keywords)}</div>

          {step.formula && (
            <div className={styles.formulaBox}>
              <div className={styles.formulaLabel}>Formula used</div>
              <div className={styles.formulaName}>{step.formulaName || "Formula"}</div>
              <div className={styles.formulaMath}>
                <SafeMathText tex={step.formula} />
              </div>
            </div>
          )}

          {step.rule && (
            <div className={styles.ruleBox}>
              <strong>Rule: </strong>
              {step.rule}
            </div>
          )}

          {(step.mathLines.length > 0 || step.workLines.length > 0) && (
            <div className={styles.workBox}>
              <div className={styles.workLabel}>Work</div>
              {step.mathLines.map((line, i) => (
                <div key={`math-${i}`} className={styles.mathLine}>
                  <SafeMathText tex={line} />
                </div>
              ))}
              {step.workLines.map((line, i) => (
                <div key={`plain-${i}`} className={`${styles.mathLine} ${styles.workPlain}`}>
                  {line}
                </div>
              ))}
            </div>
          )}

          {step.why && (
            <div className={styles.whyBox}>
              <strong>Why this works: </strong>
              {step.why}
            </div>
          )}

          {step.diagram && <GeometryDiagram diagram={step.diagram} />}
        </div>
      </div>

      <div className={styles.stepFooter}>
        <div className={styles.progressRow}>
          <div className={styles.progressText}>
            Step {stepIndex + 1} of {total}
          </div>
          <div className={styles.progressDots}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`${styles.progressDot} ${i === stepIndex ? styles.active : ""}`} />
            ))}
          </div>
        </div>
        <div className={styles.stepActions}>
          <button className={styles.stepBtn} disabled={stepIndex === 0} onClick={() => setStepIndex((value) => value - 1)}>
            ← Previous Step
          </button>
          {!isFinalStep ? (
            <button className={`${styles.stepBtn} ${styles.primary}`} onClick={() => setStepIndex((value) => value + 1)}>
              Next Step →
            </button>
          ) : (
            <div className={styles.doneState}>✓ Done reviewing</div>
          )}
        </div>
      </div>

      {isFinalStep && (solution.commonMistake || solution.satTip) && (
        <>
          {solution.commonMistake && (
            <div className={`${styles.reviewNote} ${styles.mistake}`}>
              <strong>Common mistake:</strong> {solution.commonMistake}
            </div>
          )}
          {solution.satTip && (
            <div className={`${styles.reviewNote} ${styles.tip}`}>
              <strong>SAT tip:</strong> {solution.satTip}
            </div>
          )}
        </>
      )}

      {isFinalStep && solution.remember && (
        <div className={styles.remember}>
          <strong>💡 Remember: </strong>
          {solution.remember}
        </div>
      )}
    </div>
  );
}

/** Wraps any occurrence of a keyword in the step text with a highlight, same as the original's <mark> highlighting. */
function renderKeywordHighlighted(text: string, keywords: string[]) {
  if (!keywords.length) return text;

  const lower = text.toLowerCase();
  const matches: { start: number; end: number }[] = [];
  for (const keyword of keywords) {
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    let from = 0;
    while (true) {
      const idx = lower.indexOf(key, from);
      if (idx === -1) break;
      matches.push({ start: idx, end: idx + keyword.length });
      from = idx + keyword.length;
    }
  }
  if (!matches.length) return text;

  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, i) => {
    if (match.start < cursor) return;
    if (match.start > cursor) nodes.push(text.slice(cursor, match.start));
    nodes.push(
      <mark key={i} className={styles.mathKeyword}>
        {text.slice(match.start, match.end)}
      </mark>
    );
    cursor = match.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
