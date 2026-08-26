"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { AuthFormState } from "@/app/(auth)/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button-primary" disabled={pending} style={{ width: "100%" }}>
      {pending ? "One moment…" : label}
    </button>
  );
}

export function AuthForm({
  action,
  mode
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  mode: "sign-in" | "sign-up";
}) {
  const [state, formAction] = useFormState(action, { error: null });

  return (
    <form action={formAction}>
      {mode === "sign-up" && (
        <div className="field">
          <label htmlFor="displayName">First name</label>
          <input id="displayName" name="displayName" placeholder="Your name" required />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} />
      </div>
      {state.error && <p className="error-text">{state.error}</p>}
      <SubmitButton label={mode === "sign-up" ? "Create account" : "Sign in"} />
    </form>
  );
}
