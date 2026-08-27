export function PlanetIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <circle cx="12" cy="12" r="6.5" fill="var(--accent)" opacity="0.85" />
      <ellipse cx="12" cy="12" rx="10.5" ry="3.2" stroke="var(--text-muted)" strokeWidth="1.3" opacity="0.6" />
      <circle cx="9.5" cy="9.8" r="1.1" fill="var(--surface)" opacity="0.5" />
    </svg>
  );
}
