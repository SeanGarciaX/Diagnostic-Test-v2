const MIN_SAMPLE_FOR_CLAIMS = 5;

export type DomainRow = { domain: string; attempts: number; correct: number };

export function DomainComparison({ domains }: { domains: DomainRow[] }) {
  const withAccuracy = domains.map((d) => ({ ...d, accuracy: d.attempts > 0 ? Math.round((d.correct / d.attempts) * 100) : null }));
  const eligible = withAccuracy.filter((d) => d.attempts >= MIN_SAMPLE_FOR_CLAIMS);
  const strongest = eligible.length >= 2 ? [...eligible].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0] : null;
  const focus = eligible.length >= 2 ? [...eligible].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))[0] : null;
  const maxAccuracy = Math.max(...withAccuracy.map((d) => d.accuracy ?? 0), 1);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 16 }}>Domain comparison</h2>
      <p style={{ marginTop: 0, marginBottom: 16, fontSize: 13, color: "var(--text-muted)" }}>
        How accuracy stacks up across the four SAT Math domains.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {withAccuracy.map((row) => (
          <div key={row.domain}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span>{row.domain}</span>
              <strong>{row.accuracy === null ? "—" : `${row.accuracy}%`}</strong>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "var(--surface-border)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: row.accuracy === null ? "0%" : `${Math.max(4, (row.accuracy / Math.max(maxAccuracy, 100)) * 100)}%`,
                  background: "var(--accent)",
                  opacity: row.attempts === 0 ? 0.25 : 1
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {strongest && focus ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
          <span>
            <strong style={{ color: "var(--success)" }}>Strongest domain:</strong> {strongest.domain} ({strongest.accuracy}%)
          </span>
          <span>
            <strong style={{ color: "var(--danger)" }}>Focus area:</strong> {focus.domain} ({focus.accuracy}%)
          </span>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Practice at least {MIN_SAMPLE_FOR_CLAIMS} questions in two or more domains to see a strongest-domain/focus-area comparison —
          small sample sizes can be misleading.
        </p>
      )}
    </div>
  );
}
