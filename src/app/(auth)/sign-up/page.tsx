import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { signUp } from "../actions";

export default function SignUpPage() {
  return (
    <main style={{ maxWidth: 380, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ marginBottom: 4 }}>Start your Orbit</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Create an account to track your real progress over time.</p>
      <div className="card">
        <AuthForm action={signUp} mode="sign-up" />
      </div>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </main>
  );
}
