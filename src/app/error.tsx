"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ maxWidth: 480, margin: "120px auto", textAlign: "center" }}>
      <h1>Something went wrong.</h1>
      <p style={{ color: "var(--text-muted)" }}>Your saved progress is safe — it lives in the database, not this page. Try again.</p>
      <button className="button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
