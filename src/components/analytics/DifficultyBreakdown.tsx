const KNOWN_ORDER = ["Foundations", "Easy", "Medium", "Hard", "Challenge"];

export type DifficultyRow = { difficulty: string; attempts: number; correct: number };

export function DifficultyBreakdown({ rows }: { rows: DifficultyRow[] }) {
  const present = rows.filter((row) => row.attempts > 0);
  const sorted = [...present].sort((a, b) => {
    const ai = KNOWN_ORDER.indexOf(a.difficulty);
    const bi = KNOWN_ORDER.indexOf(b.difficulty);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.difficulty.localeCompare(b.difficulty);
  });

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 16 }}>Performance by difficulty</h2>
      <p style={{ marginTop: 0, marginBottom: 16, fontSize: 13, color: "var(--text-muted)" }}>
        Accuracy at each difficulty level you&apos;ve practiced.
      </p>

      {sorted.length === 0 ? (
        <p style={{ color: "var(--text-muted)", margin: 0 }}>No questions attempted yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.map((row) => {
            const accuracy = Math.round((row.correct / row.attempts) * 100);
            return (
              <div key={row.difficulty}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>
                    {row.difficulty} <span style={{ color: "var(--text-muted)" }}>({row.attempts})</span>
                  </span>
                  <strong>{accuracy}%</strong>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "var(--surface-border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${accuracy}%`, background: "var(--accent)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
