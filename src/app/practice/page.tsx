import { requireUser } from "@/lib/requireUser";
import { fetchOrCreateProfile } from "@/lib/profile";
import { fetchRecentAttempts, fetchReviewQueue } from "@/lib/attempts";
import { fetchQuestions, pickPracticeSet, questionsByIds } from "@/lib/questions";
import { recommendPractice } from "@/lib/adaptive";
import { dueItems } from "@/lib/reviewScheduler";
import { NavShell } from "@/components/NavShell";
import { PracticeSession } from "@/components/PracticeSession";

const QUESTIONS_PER_SESSION = 8;

export default async function PracticePage({ searchParams }: { searchParams: { mode?: string } }) {
  const { supabase, user } = await requireUser();
  const profile = await fetchOrCreateProfile(supabase, user.id);
  const isReview = searchParams.mode === "review";

  const [allQuestions, attempts, reviewQueue] = await Promise.all([
    fetchQuestions(supabase, 200),
    fetchRecentAttempts(supabase, user.id),
    fetchReviewQueue(supabase, user.id)
  ]);

  const reviewItemsByProblemId = Object.fromEntries(reviewQueue.map((item) => [item.problemId, item]));

  const sessionQuestions = isReview
    ? questionsByIds(allQuestions, dueItems(reviewQueue).map((item) => item.problemId)).slice(0, QUESTIONS_PER_SESSION)
    : pickPracticeSet(allQuestions, recommendPractice(attempts).domain, QUESTIONS_PER_SESSION);

  return (
    <NavShell profile={profile} activeHref="/practice">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PracticeSession userId={user.id} questions={sessionQuestions} isReview={isReview} reviewItemsByProblemId={reviewItemsByProblemId} />
      </div>
    </NavShell>
  );
}
