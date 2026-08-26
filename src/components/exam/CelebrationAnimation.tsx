"use client";

// Wraps the finish-screen celebration animation (see
// src/lib/exam/celebrationAnimation.ts) in an iframe and bridges
// postMessages with it, same protocol as the original app: we send it
// the score once it loads, and it posts back when its own embedded
// "Review Answers" / "Return to Main Menu" buttons are clicked.

import { useEffect, useRef } from "react";
import { CELEBRATION_ANIMATION_DATA_URL } from "@/lib/exam/celebrationAnimation";
import styles from "./exam.module.css";

export function CelebrationAnimation({
  score,
  onReviewAnswers,
  onReturnToMainMenu
}: {
  score: number;
  onReviewAnswers: () => void;
  onReturnToMainMenu: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const sendScore = () => {
      frame.contentWindow?.postMessage({ type: "orbit-score", score }, "*");
    };
    frame.addEventListener("load", () => window.setTimeout(sendScore, 80));
    frame.src = CELEBRATION_ANIMATION_DATA_URL;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data || {};
      if (data.type === "orbit-review-answers") onReviewAnswers();
      else if (data.type === "orbit-return-main-menu") onReturnToMainMenu();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <div className={styles.animationView}>
      <iframe ref={frameRef} className={styles.animationFrame} title="Score celebration" />
    </div>
  );
}
