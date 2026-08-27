// A small, friendly alien used only in empty states (e.g. "no practice
// yet") — a light touch of personality, not a mascot-driven UI. Deliberately
// simple geometry so it reads clearly at small sizes.
export function AlienMascot({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <ellipse cx="32" cy="36" rx="17" ry="19" fill="#8fd6c4" />
      <ellipse cx="32" cy="36" rx="17" ry="19" fill="var(--accent)" opacity="0.18" />
      <ellipse cx="24.5" cy="33" rx="5.5" ry="6.5" fill="#12222b" />
      <ellipse cx="39.5" cy="33" rx="5.5" ry="6.5" fill="#12222b" />
      <circle cx="26" cy="31" r="1.6" fill="#fff" />
      <circle cx="41" cy="31" r="1.6" fill="#fff" />
      <path d="M26 46c2.2 2 9.8 2 12 0" stroke="#12222b" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 20 15 10M32 15V6M46 20l3-10" stroke="#8fd6c4" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="15" cy="9" r="2" fill="#f4774e" />
      <circle cx="32" cy="5" r="2" fill="#f4774e" />
      <circle cx="49" cy="9" r="2" fill="#f4774e" />
    </svg>
  );
}
