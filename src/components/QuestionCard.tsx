"use client";

// A single question, shown the same way whether it's a quick-practice
// question or one question inside the full test simulation. Purely
// presentational — all the state (which answer is selected, whether it's
// been submitted) lives in the parent so this component stays simple.

import type { Question } from "@/lib/types";
import { MathText } from "./MathText";

export function QuestionCard({
  question,
  questionNumber,
  response,
  onRespond,
  submitted,
  showCorrectness
}: {
  question: Question;
  questionNumber: number;
  response: number | string | undefined;
  onRespond: (value: number | string) => void;
  submitted: boolean;
  showCorrectness: boolean;
}) {
  const isMultipleChoice = question.choices.length > 0;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
          QUESTION {questionNumber} · {question.domain.toUpperCase()}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{question.difficulty.toUpperCase()}</span>
      </div>

      <MathText as="h2" text={question.prompt} />

      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={question.imageUrl} alt="" style={{ maxWidth: "100%", margin: "12px 0", borderRadius: 8 }} />
      )}

      {isMultipleChoice ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {question.choices.map((choice, index) => {
            const isSelected = response === index;
            const isCorrectChoice = showCorrectness && index === question.correctIndex;
            const isWrongSelection = showCorrectness && isSelected && index !== question.correctIndex;

            return (
              <button
                key={index}
                type="button"
                disabled={submitted}
                onClick={() => onRespond(index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: `1px solid ${isCorrectChoice ? "var(--success)" : isWrongSelection ? "var(--danger)" : "var(--surface-border)"}`,
                  background: isCorrectChoice ? "var(--success-bg)" : isWrongSelection ? "var(--danger-bg)" : isSelected ? "rgba(244,119,78,0.08)" : "var(--surface)",
                  textAlign: "left",
                  fontSize: 15
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: "1.5px solid var(--surface-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <MathText text={choice} />
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
            Enter your answer
          </label>
          <input
            disabled={submitted}
            value={typeof response === "string" ? response : ""}
            onChange={(event) => onRespond(event.target.value)}
            placeholder="Type a number"
            inputMode="decimal"
            style={{ border: "1px solid var(--surface-border)", borderRadius: 8, padding: "10px 12px", fontSize: 16, width: 200 }}
          />
        </div>
      )}
    </div>
  );
}
