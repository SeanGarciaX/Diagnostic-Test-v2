import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { fetchMasteryByTopic, fetchRecentAttempts, fetchReviewQueue } from "@/lib/attempts";
import { recommendPractice } from "@/lib/adaptive";
import { dueItems } from "@/lib/reviewScheduler";
import { NavShell } from "@/components/NavShell";
import type { Attempt, TopicMastery } from "@/lib/types";
import type { ReviewItem } from "@/lib/reviewScheduler";

export default async function DashboardPage() {
  const { supabase, user, profile } = await getViewer();

  // Guests have no signed-in Supabase session, so there's nothing to read
  // here yet — an empty history renders the same page with zeroed stats
  // instead of erroring.
  let attempts: Attempt[] = [];
  let mastery: TopicMastery[] = [];
  let reviewQueue: ReviewItem[] = [];
  if (user) {
    [attempts, mastery, reviewQueue] = await Promise.all([
      fetchRecentAttempts(supabase, user.id),
      fetchMasteryByTopic(supabase, user.id),
      fetchReviewQueue(supabase, user.id)
    ]);
  }

  const recommendation = recommendPractice(attempts);
  const due = dueItems(reviewQueue);
  const totalAttempts = attempts.length;
  const totalCorrect = attempts.filter((attempt) => attempt.correct).length;
  const overallAccuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : null;

  const today = new Date();
  const todayCount = attempts.filter((attempt) => sameDay(new Date(attempt.answeredAt), today)).length;

  return (
    <NavShell profile={profile} activeHref="/dashboard">
      <h1 style={{ marginTop: 0 }}>Welcome back, {profile.displayName}.</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
        {todayCount
          ? `You've answered ${todayCount} question${todayCount === 1 ? "" : "s"} today. ${Math.max(0, profile.dailyQuestionGoal - todayCount)} left in your daily goal.`
          : "No questions answered yet today — a short session keeps your momentum going."}
      </p>

      {!user && (
        <div className="card" style={{ marginBottom: 24, borderColor: "var(--accent)" }}>
          <strong>You&apos;re browsing as a guest.</strong>{" "}
          <span style={{ color: "var(--text-muted)" }}>Questions and practice work normally, but nothing is being saved.</span>{" "}
          <Link href="/sign-up">Create an account</Link> to keep your progress.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        <StatCard label="Questions answered" value={String(totalAttempts)} />
        <StatCard label="Overall accuracy" value={overallAccuracy === null ? "—" : `${overallAccuracy}%`} />
        <StatCard label="Due for review" value={String(due.length)} />
        <StatCard label="Target score" value={String(profile.targetScore)} />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: 0.5 }}>ORBIT COACH</span>
        <h2 style={{ margin: "8px 0" }}>Practice {recommendation.topic}</h2>
        <p style={{ color: "var(--text-muted)" }}>{recommendation.reason}</p>
        <Link href="/practice" className="button-primary" style={{ textDecoration: "none", display: "inline-block", marginTop: 8 }}>
          Start practicing →
        </Link>
      </div>

      {due.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: "var(--accent)" }}>
          <h2 style={{ margin: "0 0 8px" }}>{due.length} question{due.length === 1 ? "" : "s"} due for review</h2>
          <p style={{ color: "var(--text-muted)" }}>A short spaced review strengthens what you missed before.</p>
          <Link href="/practice?mode=review" className="button-secondary" style={{ textDecoration: "none", display: "inline-block", marginTop: 8 }}>
            Review now
          </Link>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Mastery by topic</h2>
        {mastery.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Complete a practice session to see your mastery breakdown here.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mastery
              .sort((a, b) => a.accuracy - b.accuracy)
              .map((topic) => (
                <div key={topic.topic}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                    <span>{topic.topic}</span>
                    <strong>{topic.accuracy}%</strong>
                  </div>
                  <div style={{ height: 8, background: "var(--surface-border)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${topic.accuracy}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </NavShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
