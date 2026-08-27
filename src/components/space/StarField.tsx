// A handful of scattered dots, meant as a very subtle background accent
// (e.g. behind the Daily Mission card) — not a literal starfield
// illustration, just enough texture to read as "space" without competing
// with the actual content.
const STARS = [
  { x: 6, y: 12, r: 1.1, o: 0.5 },
  { x: 22, y: 6, r: 0.8, o: 0.35 },
  { x: 38, y: 18, r: 1.3, o: 0.45 },
  { x: 58, y: 8, r: 0.9, o: 0.3 },
  { x: 74, y: 20, r: 1.1, o: 0.4 },
  { x: 90, y: 10, r: 0.8, o: 0.3 },
  { x: 14, y: 30, r: 0.7, o: 0.25 },
  { x: 50, y: 28, r: 1, o: 0.3 },
  { x: 84, y: 32, r: 0.9, o: 0.35 }
];

export function StarField({ width = 100, height = 40 }: { width?: number; height?: number }) {
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
      {STARS.map((star, i) => (
        <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="var(--text)" opacity={star.o} />
      ))}
    </svg>
  );
}
