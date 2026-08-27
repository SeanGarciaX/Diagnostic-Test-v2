export function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>{value}</div>
      {sublabel && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{sublabel}</div>}
    </div>
  );
}
