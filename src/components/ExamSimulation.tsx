"use client";

// A timed, one-module practice test: 22 questions, 35 minutes, with a
// question navigator (flag/answered state) and a review-before-submit
// screen — the parts of the original Diagnostic-Test app's exam feel that
// actually mattered for practicing real test conditions. Left out on
// purpose to keep this readable: the graphing calculator and a
// second, difficulty-adjusted module. Both are natural follow-ups once
// this pattern is familiar (see the README).

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isAnswerCorrect } from "@/lib/questions";
import { completeSession, markMissedForReview, recordAttempt, startSession } from "@/lib/attempts";
import type { Question } from "@/lib/types";
import { QuestionCard } from "./QuestionCard";
import { SolutionPanel } from "./SolutionPanel";

const TIME_LIMIT_SECONDS = 35 * 60;

type Phase = "active" | "reviewing" | "finished";

export function ExamSimulation({ userId, questions }: { userId: string; questions: Question[] }) {
  const supabase = createClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SECONDS);
  const [phase, setPhase] = useState<Phase>("active");
  const [navigatorOpen, setNavigatorOpen] = useState(false);

  useEffect(() => {
    startSession(supabase, userId, "full_test").then(setSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "active") return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setPhase("reviewing");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const answeredCount = Object.keys(answers).length;
  const toggleFlag = (i: number) => setFlagged((items) => (items.includes(i) ? items.filter((v) => v !== i) : [...items, i]));

  const submit = async () => {
    if (!sessionId) return;
    setPhase("finished");

    let correctCount = 0;
    for (const [questionIndex, response] of Object.entries(answers)) {
      const question = questions[Number(questionIndex)];
      const correct = isAnswerCorrect(question, response);
      if (correct) correctCount += 1;

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
        confidence: "Okay",
        timeSeconds: null
      });

      if (!correct) await markMissedForReview(supabase, userId, question.id);
    }

    await completeSession(supabase, sessionId, questions.length, correctCount);
  };

  if (questions.length === 0) {
    return (
      <div className="card">
        <p>No questions are available for a full test right now.</p>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>
    );
  }

  if (phase === "finished") {
    const correctCount = questions.filter((question, i) => isAnswerCorrect(question, answers[i])).length;
    return (
      <div>
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>
            {correctCount} of {questions.length} correct
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            {answeredCount} answered · {flagged.length} flagged. This is a practice simulation, not an official SAT score.
          </p>
          <Link href="/dashboard" className="button-primary" style={{ textDecoration: "none", display: "inline-block" }}>
            Back to dashboard
          </Link>
        </div>
        {questions.map((question, i) => (
          <div key={question.id} style={{ marginBottom: 20 }}>
            <QuestionCard question={question} questionNumber={i + 1} response={answers[i]} onRespond={() => {}} submitted showCorrectness />
            <SolutionPanel solution={question.solution} correct={isAnswerCorrect(question, answers[i])} />
          </div>
        ))}
      </div>
    );
  }

  if (phase === "reviewing") {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Before you submit</h2>
        <p style={{ color: "var(--text-muted)" }}>
          {questions.length - answeredCount === 0 ? "Every question has an answer." : `${questions.length - answeredCount} question(s) unanswered.`}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))", gap: 8, margin: "16px 0" }}>
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIndex(i);
                setPhase("active");
              }}
              style={{
                padding: "8px 0",
                borderRadius: 6,
                border: `1.5px dashed ${flagged.includes(i) ? "var(--accent)" : "var(--surface-border)"}`,
                background: answers[i] !== undefined ? "rgba(31,122,61,0.08)" : "var(--surface)",
                fontWeight: 700
              }}
            >
              {i + 1}
              {flagged.includes(i) ? " ⚑" : ""}
            </button>
          ))}
        </div>
        <button className="button-primary" onClick={submit}>
          Submit test
        </button>
      </div>
    );
  }

  const question = questions[index];

  return (
    <div>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <strong>{formatTime(secondsLeft)}</strong>
        <button className="button-secondary" onClick={() => setNavigatorOpen((value) => !value)}>
          Question {index + 1} of {questions.length} ▾
        </button>
        <button className="button-secondary" onClick={() => setPhase("reviewing")}>
          Review &amp; submit
        </button>
      </div>

      {navigatorOpen && (
        <div className="card" style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: 6 }}>
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIndex(i);
                setNavigatorOpen(false);
              }}
              style={{
                padding: "6px 0",
                borderRadius: 6,
                border: `1.5px solid ${i === index ? "var(--accent)" : "var(--surface-border)"}`,
                background: answers[i] !== undefined ? "rgba(31,122,61,0.08)" : "var(--surface)"
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button className="button-secondary" onClick={() => toggleFlag(index)} style={{ fontSize: 13 }}>
          {flagged.includes(index) ? "★ Flagged" : "☆ Flag for review"}
        </button>
      </div>

      <QuestionCard
        question={question}
        questionNumber={index + 1}
        response={answers[index]}
        onRespond={(value) => setAnswers((values) => ({ ...values, [index]: value }))}
        submitted={false}
        showCorrectness={false}
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button className="button-secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          ← Previous
        </button>
        <button
          className="button-primary"
          onClick={() => (index + 1 === questions.length ? setPhase("reviewing") : setIndex((i) => i + 1))}
        >
          {index + 1 === questions.length ? "Review answers" : "Next →"}
        </button>
      </div>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
