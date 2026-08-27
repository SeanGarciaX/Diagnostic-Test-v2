import type { DailyStat } from "@/lib/dashboardData";

const DAY_MS = 86_400_000;

/** Buckets the last `weeks` * 7 days of daily rows into simple weekly totals (most recent week last), ending on today. */
function bucketByWeek(days: DailyStat[], weeks: number, now = new Date()) {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const buckets: { label: string; attempts: number }[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    let attempts = 0;
    for (let d = 0; d < 7; d++) {
      const offsetDays = w * 7 + d;
      const day = new Date(now.getTime() - offsetDays * DAY_MS).toISOString().slice(0, 10);
      attempts += byDay.get(day)?.attempts ?? 0;
    }
    buckets.push({ label: w === 0 ? "This week" : `${w} wk${w === 1 ? "" : "s"} ago`, attempts });
  }
  return buckets;
}

export function WeeklyVolumeChart({ days, weeks = 5 }: { days: DailyStat[]; weeks?: number }) {
  const buckets = bucketByWeek(days, weeks);
  const max = Math.max(...buckets.map((b) => b.attempts), 1);
  const total = buckets.reduce((sum, b) => sum + b.attempts, 0);

  if (total === 0) {
    return <p style={{ color: "var(--text-muted)", margin: 0 }}>No practice recorded in this period yet.</p>;
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 110, marginTop: 4 }}>
      {buckets.map((bucket) => (
        <div key={bucket.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{bucket.attempts}</span>
          <div
            style={{
              width: "100%",
              maxWidth: 36,
              height: Math.max(4, (bucket.attempts / max) * 70),
              borderRadius: 4,
              background: "var(--accent)",
              opacity: bucket.attempts === 0 ? 0.15 : 0.75
            }}
          />
          <span style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>{bucket.label}</span>
        </div>
      ))}
    </div>
  );
}
