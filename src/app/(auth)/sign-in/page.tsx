import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { signIn } from "../actions";

export default function SignInPage() {
  return (
    <main style={{ maxWidth: 380, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ marginBottom: 4 }}>Welcome back</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Sign in to continue your SAT Math practice.</p>
      <div className="card">
        <AuthForm action={signIn} mode="sign-in" />
      </div>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        New here? <Link href="/sign-up">Create an account</Link>
      </p>
    </main>
  );
}
