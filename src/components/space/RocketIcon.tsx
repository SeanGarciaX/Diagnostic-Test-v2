// Small, reusable space-theme accents for Dashboard/Analytics only (see
// the scope note in src/app/dashboard/page.tsx). Plain inline SVG — no new
// dependency, no external assets, colors driven by the current theme's
// CSS variables so these work across all three palettes.

export function RocketIcon({ size = 28, tilt = -45 }: { size?: number; tilt?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${tilt}deg)`, flexShrink: 0 }} aria-hidden>
      <path
        d="M12 2c2.8 1.8 4.5 5 4.5 9 0 2-.5 3.8-1.3 5.2l-3.2 2.3-3.2-2.3C7.9 14.8 7.5 13 7.5 11c0-4 1.7-7.2 4.5-9Z"
        fill="var(--accent)"
      />
      <circle cx="12" cy="10.5" r="1.8" fill="var(--surface)" />
      <path d="M7.5 13.5 4.5 15.8l1.4 3.4 2.6-2.7" fill="var(--text-muted)" opacity="0.7" />
      <path d="M16.5 13.5l3 2.3-1.4 3.4-2.6-2.7" fill="var(--text-muted)" opacity="0.7" />
      <path d="M10.3 18.5h3.4l-1.7 3.5-1.7-3.5Z" fill="#f4774e" opacity="0.9" />
    </svg>
  );
}
