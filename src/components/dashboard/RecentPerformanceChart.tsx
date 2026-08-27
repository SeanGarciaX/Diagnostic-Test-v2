// "Accuracy over the last 7 days," with question volume shown alongside it
// so a single-question 100% day doesn't read with the same confidence as a
// 35-question 100% day (see the analytics spec's note on this). Plain
// server-rendered SVG — no chart library, no client JS needed.

import type { DailyStat } from "@/lib/dashboardData";
import { AlienMascot } from "@/components/space/AlienMascot";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RecentPerformanceChart({ days, dayKeys }: { days: DailyStat[]; dayKeys: string[] }) {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const rows = dayKeys.map((day) => {
    const row = byDay.get(day) ?? { day, attempts: 0, correct: 0, activeSeconds: 0 };
    const accuracy = row.attempts > 0 ? Math.round((row.correct / row.attempts) * 100) : null;
    const weekday = WEEKDAY_LABELS[new Date(`${day}T00:00:00Z`).getUTCDay()];
    return { ...row, accuracy, weekday };
  });

  const totalAttempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  if (totalAttempts === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 4px" }}>
        <AlienMascot size={48} />
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Complete a few practice questions to start tracking your progress here.
        </p>
      </div>
    );
  }

  const width = 560;
  const height = 160;
  const padTop = 16;
  const padBottom = 28;
  const padX = 24;
  const chartHeight = height - padTop - padBottom;
  const colWidth = (width - padX * 2) / rows.length;
  const maxAttempts = Math.max(...rows.map((r) => r.attempts), 1);

  const linePoints = rows
    .map((row, i) => {
      if (row.accuracy === null) return null;
      const x = padX + colWidth * i + colWidth / 2;
      const y = padTop + chartHeight - (row.accuracy / 100) * chartHeight;
      return { x, y };
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  const polylinePoints = linePoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Accuracy and questions attempted over the last 7 days" style={{ minWidth: 420 }}>
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
          const barHeight = row.attempts > 0 ? Math.max(4, (row.attempts / maxAttempts) * (chartHeight * 0.55) ) : 0;
          return (
            <g key={row.day}>
              <rect
                x={x + colWidth * 0.3}
                y={padTop + chartHeight - barHeight}
                width={colWidth * 0.4}
                height={barHeight}
                rx={2}
                fill="var(--accent)"
                opacity={0.18}
              >
                <title>
                  {row.weekday}: {row.attempts} question{row.attempts === 1 ? "" : "s"}
                </title>
              </rect>
              <text x={x + colWidth / 2} y={height - 8} fontSize="10" fill="var(--text-muted)" textAnchor="middle">
                {row.weekday}
              </text>
            </g>
          );
        })}

        {linePoints.length > 1 && <polyline points={polylinePoints} fill="none" stroke="var(--accent)" strokeWidth="2" />}
        {rows.map((row, i) => {
          if (row.accuracy === null) return null;
          const x = padX + colWidth * i + colWidth / 2;
          const y = padTop + chartHeight - (row.accuracy / 100) * chartHeight;
          return (
            <circle key={row.day} cx={x} cy={y} r={row.attempts >= 10 ? 4 : row.attempts >= 3 ? 3 : 2.2} fill="var(--accent)">
              <title>
                {row.weekday}: {row.accuracy}% accuracy ({row.correct}/{row.attempts})
              </title>
            </circle>
          );
        })}
      </svg>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
        Line = accuracy · bar height = questions attempted that day. A larger dot means more questions went into that day&apos;s accuracy.
      </p>
    </div>
  );
}
