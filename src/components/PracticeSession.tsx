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
import { playSound } from "@/lib/sounds";
import { recordQuestionAttempt } from "@/lib/analytics";
import { getOrCreateGuestIdClient } from "@/lib/guestId";
import { useActiveTimeTracker } from "@/lib/activeTime";
import { randomId } from "@/lib/id";
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
  // Guests (userId === null) have no Supabase session, so the OLD
  // signed-in-only `attempts` table write is skipped for them — that
  // table's RLS policy rejects any row with no real auth.uid() anyway.
  // The NEW centralized `question_attempts` write a few lines down runs
  // for guests AND signed-in students alike; see src/lib/analytics.ts.
  const sessionIdRef = useRef<Promise<string> | null>(null);
  if (!sessionIdRef.current && userId) {
    sessionIdRef.current = startSession(supabase, userId, isReview ? "practice" : "practice");
  }
  // One id per PracticeSession mount, groups this run's attempts together
  // in the new centralized table (see question_attempts.session_id).
  const analyticsSessionIdRef = useRef<string | null>(null);
  if (!analyticsSessionIdRef.current) analyticsSessionIdRef.current = randomId();
  // Lazily read/created on first submit (getOrCreateGuestIdClient touches
  // document, so it can't run during server-side render).
  const guestIdRef = useRef<string | null>(null);
  const { activeSecondsBetween } = useActiveTimeTracker();
  // Guards against a single click firing submit() twice (a fast
  // double-click, or a re-render racing the async work below) before
  // `submitted` state has actually flipped — see the analytics spec's
  // duplicate-prevention requirement. The primary key on question_attempts
  // is the backstop for anything this guard misses.
  const submitInFlightRef = useRef(false);

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
    submitInFlightRef.current = false;
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
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setSubmitted(true);

    const correct = isAnswerCorrect(question, response);
    if (correct) setCorrectCount((count) => count + 1);
    // Play immediately, synchronously within this click handler — waiting
    // until after the database write below risks the browser no longer
    // treating this as a direct response to the user's click, which some
    // browsers require in order to allow audio playback.
    playSound(correct ? "correct" : "incorrect");

    // Centralized analytics — records for a guest and a signed-in student
    // alike, feeds the Dashboard/Analytics pages. Fire-and-forget on
    // purpose: an analytics write should never block or fail the actual
    // practice flow (see recordQuestionAttempt's own error handling).
    if (!guestIdRef.current && !userId) guestIdRef.current = getOrCreateGuestIdClient();
    void recordQuestionAttempt(supabase, {
      attemptEventId: randomId(),
      userId,
      guestId: userId ? null : guestIdRef.current,
      sessionId: analyticsSessionIdRef.current!,
      practiceMode: isReview ? "spaced_review" : "quick_practice",
      question,
      selectedResponse: response,
      startedAt,
      activeSeconds: activeSecondsBetween(startedAt, Date.now())
    });

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
    playSound("practiceComplete");
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
