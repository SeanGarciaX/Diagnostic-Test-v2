import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { fetchMasteryByTopic, fetchRecentAttempts, fetchReviewQueue } from "@/lib/attempts";
import { calculateMastery } from "@/lib/mastery";
import { reviewLabel } from "@/lib/reviewScheduler";
import { NavShell } from "@/components/NavShell";
import type { Attempt, TopicMastery } from "@/lib/types";
import type { ReviewItem } from "@/lib/reviewScheduler";

export default async function ProgressPage() {
  const { supabase, user, profile } = await getViewer();

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

  const overallMastery = calculateMastery(attempts);

  return (
    <NavShell profile={profile} activeHref="/progress">
      <h1 style={{ marginTop: 0 }}>Your progress</h1>
      {!user && (
        <p style={{ color: "var(--text-muted)", marginTop: -8, marginBottom: 24 }}>
          Browsing as a guest — <Link href="/sign-up">create an account</Link> to start building real history here.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <MetricCard label="Mastery score" value={`${overallMastery.score}`} />
        <MetricCard label="Accuracy" value={`${overallMastery.accuracy}%`} />
        <MetricCard label="Answered without hints" value={`${overallMastery.independence}%`} />
        <MetricCard label="Recent retention" value={`${overallMastery.retention}%`} />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Mastery by topic</h2>
        {mastery.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No practice recorded yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 12 }}>
                <th style={{ paddingBottom: 8 }}>Topic</th>
                <th>Domain</th>
                <th>Attempts</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {mastery
                .sort((a, b) => a.accuracy - b.accuracy)
                .map((row) => (
                  <tr key={row.topic} style={{ borderTop: "1px solid var(--surface-border)" }}>
                    <td style={{ padding: "8px 0" }}>{row.topic}</td>
                    <td style={{ color: "var(--text-muted)" }}>{row.domain}</td>
                    <td>{row.attempts}</td>
                    <td style={{ fontWeight: 700 }}>{row.accuracy}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Spaced review queue</h2>
        {reviewQueue.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nothing in your review queue — keep practicing to build one up.</p>
        ) : (
          <ul style={{ paddingLeft: 18, fontSize: 14 }}>
            {reviewQueue.map((item) => (
              <li key={item.problemId} style={{ marginBottom: 4 }}>
                Question {item.problemId} — {reviewLabel(item)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Recent attempts</h2>
        {attempts.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No attempts yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 12 }}>
                <th style={{ paddingBottom: 8 }}>Topic</th>
                <th>Result</th>
                <th>Confidence</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {attempts.slice(0, 30).map((attempt) => (
                <tr key={attempt.id} style={{ borderTop: "1px solid var(--surface-border)" }}>
                  <td style={{ padding: "8px 0" }}>{attempt.topic}</td>
                  <td style={{ color: attempt.correct ? "var(--success)" : "var(--danger)", fontWeight: 700 }}>
                    {attempt.correct ? "Correct" : "Missed"}
                  </td>
                  <td>{attempt.confidence}</td>
                  <td style={{ color: "var(--text-muted)" }}>{new Date(attempt.answeredAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </NavShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
