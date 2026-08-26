"use client";

// Drives one quick-practice session: shows a question, records the
// answer to the database as soon as it's submitted, then moves on. This
// is the untimed, one-question-at-a-time mode — see
// src/components/exam/FullTestExam.tsx for the timed Full Test.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isAnswerCorrect } from "@/lib/questions";
import { advanceReviewItem, completeSession, markMissedForReview, recordAttempt, startSession } from "@/lib/attempts";
import { scheduleAfterSuccess } from "@/lib/reviewScheduler";
import type { Confidence, Question } from "@/lib/types";
import type { ReviewItem } from "@/lib/reviewScheduler";
import { QuestionCard } from "./QuestionCard";
import { SolutionPanel } from "./SolutionPanel";

export function PracticeSession({
  userId,
  questions,
  isReview,
  reviewItemsByProblemId
}: {
  userId: string | null;
  questions: Question[];
  isReview: boolean;
  reviewItemsByProblemId: Record<string, ReviewItem>;
}) {
  const supabase = createClient();
  // Guests (userId === null) have no Supabase session, so any write here
  // would just be rejected by Row Level Security — skip persistence
  // entirely and let them work through the session locally instead.
  const sessionIdRef = useRef<Promise<string> | null>(null);
  if (!sessionIdRef.current && userId) {
    sessionIdRef.current = startSession(supabase, userId, isReview ? "practice" : "practice");
  }

  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<number | string>();
  const [submitted, setSubmitted] = useState(false);
  const [confidence, setConfidence] = useState<Confidence>("Okay");
  const [startedAt, setStartedAt] = useState(Date.now());
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];

  useEffect(() => {
    setResponse(undefined);
    setSubmitted(false);
    setConfidence("Okay");
    setStartedAt(Date.now());
  }, [index]);

  if (questions.length === 0) {
    return (
      <div className="card">
        <p>Nothing to practice right now — nice work!</p>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="card">
        <h2>Session complete</h2>
        <p>
          {correctCount} of {questions.length} correct.
        </p>
        <Link href="/dashboard" className="button-primary" style={{ textDecoration: "none", display: "inline-block", marginTop: 8 }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  const submit = async () => {
    if (response === undefined) return;
    setSubmitted(true);

    const correct = isAnswerCorrect(question, response);
    if (correct) setCorrectCount((count) => count + 1);

    if (userId) {
      const sessionId = await sessionIdRef.current;
      await recordAttempt(supabase, {
        userId,
        sessionId,
        problemId: question.id,
        domain: question.domain,
        topic: question.topic,
        difficulty: question.difficulty,
        correct,
        selectedAnswer: typeof response === "number" ? question.choices[response] : response,
        correctAnswer: question.correctIndex !== null ? question.choices[question.correctIndex] : question.correctValue,
        hintUsed: false,
        confidence,
        timeSeconds: Math.round((Date.now() - startedAt) / 1000)
      });

      const existingReviewItem = reviewItemsByProblemId[question.id];
      if (existingReviewItem && correct) {
        const advanced = scheduleAfterSuccess(existingReviewItem);
        await advanceReviewItem(
          supabase,
          userId,
          existingReviewItem,
          advanced?.reviewStage ?? existingReviewItem.reviewStage,
          advanced?.nextReviewAt ?? null
        );
      } else if (!correct) {
        await markMissedForReview(supabase, userId, question.id);
      }
    }
  };

  const next = async () => {
    if (index + 1 < questions.length) {
      setIndex((value) => value + 1);
      return;
    }
    if (userId) {
      const sessionId = await sessionIdRef.current;
      await completeSession(supabase, sessionId!, questions.length, correctCount);
    }
    setFinished(true);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13, color: "var(--text-muted)" }}>
        <span>{isReview ? "SPACED REVIEW" : "QUICK PRACTICE"}</span>
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>

      <QuestionCard
        question={question}
        questionNumber={index + 1}
        response={response}
        onRespond={setResponse}
        submitted={submitted}
        showCorrectness={submitted}
      />

      {!submitted && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>How confident are you?</span>
          {(["Unsure", "Okay", "Confident"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setConfidence(value)}
              className={confidence === value ? "button-primary" : "button-secondary"}
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      {submitted && <SolutionPanel solution={question.solution} correct={isAnswerCorrect(question, response)} />}

      <div style={{ marginTop: 16 }}>
        {!submitted ? (
          <button className="button-primary" onClick={submit} disabled={response === undefined}>
            Check answer
          </button>
        ) : (
          <button className="button-primary" onClick={next}>
            {index + 1 === questions.length ? "Finish session" : "Next question →"}
          </button>
        )}
      </div>
    </div>
  );
}
