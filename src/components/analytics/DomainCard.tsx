import { formatDuration } from "@/lib/dashboardData";

export type DomainPerformanceIndicator = "none" | "starting" | "needs-practice" | "developing" | "solid" | "strong";

export function indicatorFor(accuracy: number | null, attempts: number): DomainPerformanceIndicator {
  if (attempts === 0) return "none";
  if (attempts < 5) return "starting";
  if (accuracy === null) return "starting";
  if (accuracy >= 85) return "strong";
  if (accuracy >= 70) return "solid";
  if (accuracy >= 50) return "developing";
  return "needs-practice";
}

const INDICATOR_LABEL: Record<DomainPerformanceIndicator, string> = {
  none: "No data yet",
  starting: "Just getting started",
  "needs-practice": "Needs practice",
  developing: "Developing",
  solid: "Solid",
  strong: "Strong"
};

const INDICATOR_COLOR: Record<DomainPerformanceIndicator, string> = {
  none: "var(--text-muted)",
  starting: "var(--text-muted)",
  "needs-practice": "var(--danger)",
  developing: "#b8860b",
  solid: "var(--accent)",
  strong: "var(--success)"
};

export function DomainCard({
  domain,
  attempts,
  correct,
  avgActiveSeconds
}: {
  domain: string;
  attempts: number;
  correct: number;
  avgActiveSeconds: number | null;
}) {
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : null;
  const indicator = indicatorFor(accuracy, attempts);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{domain}</h3>
        <span style={{ fontSize: 12, fontWeight: 700, color: INDICATOR_COLOR[indicator] }}>{INDICATOR_LABEL[indicator]}</span>
      </div>

      {attempts === 0 ? (
        <p style={{ color: "var(--text-muted)", margin: 0 }}>No questions attempted yet.</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 700 }}>{accuracy}%</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>accuracy</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
            {correct} / {attempts} correct
            {avgActiveSeconds !== null && <> · Average time: {formatDuration(avgActiveSeconds)}</>}
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--surface-border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${accuracy}%`, background: INDICATOR_COLOR[indicator] }} />
          </div>
        </>
      )}
    </div>
  );
}
