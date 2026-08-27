import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { fetchRecentAttempts, fetchReviewQueue } from "@/lib/attempts";
import { fetchQuestions, pickPracticeSet, questionsByIds } from "@/lib/questions";
import { recommendPractice } from "@/lib/adaptive";
import { dueItems } from "@/lib/reviewScheduler";
import { NavShell } from "@/components/NavShell";
import { PracticeSession } from "@/components/PracticeSession";
import type { Attempt } from "@/lib/types";
import type { ReviewItem } from "@/lib/reviewScheduler";

const QUESTIONS_PER_SESSION = 8;

export default async function PracticePage({ searchParams }: { searchParams: { mode?: string } }) {
  const { supabase, user, profile } = await getViewer();
  const isReview = searchParams.mode === "review";

  // The question bank itself is public-readable (no login needed) — only
  // reading/writing a specific student's history requires a real session.
  const [allQuestions, attempts, reviewQueue] = await Promise.all([
    fetchQuestions(supabase, 200),
    user ? fetchRecentAttempts(supabase, user.id) : Promise.resolve<Attempt[]>([]),
    user ? fetchReviewQueue(supabase, user.id) : Promise.resolve<ReviewItem[]>([])
  ]);

  const reviewItemsByProblemId = Object.fromEntries(reviewQueue.map((item) => [item.problemId, item]));

  const sessionQuestions = isReview
    ? questionsByIds(allQuestions, dueItems(reviewQueue).map((item) => item.problemId)).slice(0, QUESTIONS_PER_SESSION)
    : pickPracticeSet(allQuestions, recommendPractice(attempts).domain, QUESTIONS_PER_SESSION);

  return (
    <NavShell profile={profile} activeHref="/practice">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {!user && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
            Browsing as a guest — your answers are tracked on this browser and show up on your{" "}
            <Link href="/dashboard">Dashboard</Link>.
          </p>
        )}
        <PracticeSession userId={user?.id ?? null} questions={sessionQuestions} isReview={isReview} reviewItemsByProblemId={reviewItemsByProblemId} />
      </div>
    </NavShell>
  );
}
