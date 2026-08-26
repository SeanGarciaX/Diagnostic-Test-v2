"use client";

import type { QuestionSolution } from "@/lib/types";
import { MathText } from "./MathText";

export function SolutionPanel({ solution, correct }: { solution: QuestionSolution; correct: boolean }) {
  return (
    <div className="card" style={{ marginTop: 16, background: correct ? "var(--success-bg)" : "var(--surface)" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: correct ? "var(--success)" : "var(--accent)" }}>
        {correct ? "CORRECT" : "LET'S REVIEW"}
      </span>

      {!solution.available ? (
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>A written solution isn&apos;t available for this question yet.</p>
      ) : (
        <>
          {solution.concept && (
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <strong>Concept:</strong> {solution.concept}
            </p>
          )}
          {solution.strategy && (
            <p style={{ fontSize: 14, marginTop: 4 }}>
              <strong>Strategy:</strong> {solution.strategy}
            </p>
          )}

          <ol style={{ paddingLeft: 20, marginTop: 12 }}>
            {solution.steps.map((step, index) => (
              <li key={index} style={{ marginBottom: 12 }}>
                <strong>{step.title || `Step ${index + 1}`}</strong>
                {step.explanation && <p style={{ margin: "4px 0", fontFamily: "var(--font-serif)" }}>{step.explanation}</p>}
                {step.mathLines.map((line, lineIndex) => (
                  <MathText key={lineIndex} as="div" text={line} />
                ))}
                {step.rule && (
                  <p style={{ marginTop: 4, fontSize: 13, background: "#fff8e1", padding: "6px 10px", borderRadius: 6 }}>{step.rule}</p>
                )}
              </li>
            ))}
          </ol>

          {solution.finalAnswer && (
            <p style={{ fontWeight: 700, color: "var(--success)" }}>
              Final answer: <MathText text={solution.finalAnswer} />
            </p>
          )}
          {solution.commonMistake && (
            <p style={{ fontSize: 13, background: "var(--danger-bg)", padding: "8px 10px", borderRadius: 6 }}>
              <strong>Common mistake:</strong> {solution.commonMistake}
            </p>
          )}
          {solution.satTip && (
            <p style={{ fontSize: 13, background: "rgba(244,119,78,0.08)", padding: "8px 10px", borderRadius: 6, marginTop: 8 }}>
              <strong>SAT tip:</strong> {solution.satTip}
            </p>
          )}
        </>
      )}
    </div>
  );
}
