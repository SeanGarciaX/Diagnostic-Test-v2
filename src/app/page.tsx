import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "100px 20px", textAlign: "center" }}>
      <span style={{ fontWeight: 700, letterSpacing: 1, color: "var(--accent)", fontSize: 13 }}>ORBIT SAT MATH</span>
      <h1 style={{ fontSize: 42, margin: "12px 0 16px" }}>Practice that knows where you&apos;re going.</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 17, marginBottom: 32 }}>
        Real SAT Math questions, an adaptive study plan, and progress that&apos;s actually saved — not just in your browser.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link href="/sign-up" className="button-primary" style={{ textDecoration: "none", display: "inline-block" }}>
          Create your account
        </Link>
        <Link href="/sign-in" className="button-secondary" style={{ textDecoration: "none", display: "inline-block" }}>
          Sign in
        </Link>
      </div>
    </main>
  );
}
