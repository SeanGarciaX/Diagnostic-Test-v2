import type { RecentQuestionAttempt } from "@/lib/dashboardData";
import { formatDuration } from "@/lib/dashboardData";

export function RecentMistakes({ attempts }: { attempts: RecentQuestionAttempt[] }) {
  const mistakes = attempts.filter((a) => !a.correct).slice(0, 8);

  if (mistakes.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)", margin: 0 }}>
        {attempts.length === 0 ? "No questions attempted yet." : "No mistakes in your most recent attempts — nice work."}
      </p>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 11 }}>
          <th style={{ paddingBottom: 8, fontWeight: 700 }}>Domain / Topic</th>
          <th style={{ fontWeight: 700 }}>Difficulty</th>
          <th style={{ fontWeight: 700 }}>Time spent</th>
          <th style={{ fontWeight: 700 }}>When</th>
        </tr>
      </thead>
      <tbody>
        {mistakes.map((attempt) => (
          <tr key={attempt.id} style={{ borderTop: "1px solid var(--surface-border)" }}>
            <td style={{ padding: "8px 0" }}>
              {attempt.topic ?? "General"}
              <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{attempt.domain ?? "Unknown domain"}</div>
            </td>
            <td style={{ color: "var(--text-muted)" }}>{attempt.difficulty ?? "—"}</td>
            <td style={{ color: "var(--text-muted)" }}>{formatDuration(attempt.activeTimeSeconds)}</td>
            <td style={{ color: "var(--text-muted)" }}>{new Date(attempt.submittedAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
