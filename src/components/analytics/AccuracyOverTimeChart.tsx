import type { DailyStat } from "@/lib/dashboardData";
import { AlienMascot } from "@/components/space/AlienMascot";

/** Same idea as the Dashboard's 7-day chart, generalized for a longer window (dense weekday labels don't fit past ~10 days, so only every few days gets a label here). */
export function AccuracyOverTimeChart({ days, dayKeys }: { days: DailyStat[]; dayKeys: string[] }) {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const rows = dayKeys.map((day) => {
    const row = byDay.get(day) ?? { day, attempts: 0, correct: 0, activeSeconds: 0 };
    const accuracy = row.attempts > 0 ? Math.round((row.correct / row.attempts) * 100) : null;
    return { ...row, accuracy };
  });

  const totalAttempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  if (totalAttempts === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 4px" }}>
        <AlienMascot size={48} />
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Not enough practice yet to chart accuracy over time.</p>
      </div>
    );
  }

  const width = 640;
  const height = 170;
  const padTop = 16;
  const padBottom = 26;
  const padX = 28;
  const chartHeight = height - padTop - padBottom;
  const colWidth = (width - padX * 2) / rows.length;
  const maxAttempts = Math.max(...rows.map((r) => r.attempts), 1);
  const labelEvery = Math.max(1, Math.ceil(rows.length / 8));

  const linePoints = rows
    .map((row, i) => {
      if (row.accuracy === null) return null;
      const x = padX + colWidth * i + colWidth / 2;
      const y = padTop + chartHeight - (row.accuracy / 100) * chartHeight;
      return `${x},${y}`;
    })
    .filter((p): p is string => p !== null)
    .join(" ");

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Accuracy and questions attempted over time" style={{ minWidth: 480 }}>
        {[0, 50, 100].map((pct) => {
          const y = padTop + chartHeight - (pct / 100) * chartHeight;
          return (
            <g key={pct}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="var(--surface-border)" strokeWidth="1" />
              <text x={2} y={y + 3} fontSize="9" fill="var(--text-muted)">
                {pct}%
              </text>
            </g>
          );
        })}

        {rows.map((row, i) => {
          const x = padX + colWidth * i;
          const barHeight = row.attempts > 0 ? Math.max(3, (row.attempts / maxAttempts) * (chartHeight * 0.5)) : 0;
          const showLabel = i % labelEvery === 0 || i === rows.length - 1;
          const [, month, date] = row.day.split("-");
          return (
            <g key={row.day}>
              <rect x={x + colWidth * 0.25} y={padTop + chartHeight - barHeight} width={colWidth * 0.5} height={barHeight} rx={1.5} fill="var(--accent)" opacity={0.18}>
                <title>
                  {row.day}: {row.attempts} question{row.attempts === 1 ? "" : "s"}
                </title>
              </rect>
              {showLabel && (
                <text x={x + colWidth / 2} y={height - 8} fontSize="9" fill="var(--text-muted)" textAnchor="middle">
                  {month}/{date}
                </text>
              )}
            </g>
          );
        })}

        {rows.filter((r) => r.accuracy !== null).length > 1 && <polyline points={linePoints} fill="none" stroke="var(--accent)" strokeWidth="2" />}
        {rows.map((row, i) => {
          if (row.accuracy === null) return null;
          const x = padX + colWidth * i + colWidth / 2;
          const y = padTop + chartHeight - (row.accuracy / 100) * chartHeight;
          return (
            <circle key={row.day} cx={x} cy={y} r={row.attempts >= 10 ? 3.5 : row.attempts >= 3 ? 2.6 : 1.8} fill="var(--accent)">
              <title>
                {row.day}: {row.accuracy}% ({row.correct}/{row.attempts})
              </title>
            </circle>
          );
        })}
      </svg>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
        Line = accuracy · bar height = questions attempted. Larger dots mean more questions went into that day&apos;s accuracy.
      </p>
    </div>
  );
}
