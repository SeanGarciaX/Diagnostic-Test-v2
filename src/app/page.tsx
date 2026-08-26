import { redirect } from "next/navigation";

// TEMPORARY: sign-up is disabled as the front door while an account-
// creation bug is being fixed, so every visitor goes straight into the
// app as a guest (see src/lib/viewer.ts). /sign-in and /sign-up still
// work directly by URL. To restore the real landing page + auth gate,
// see git history on this file for the previous version.
export default function HomePage() {
  redirect("/dashboard");
}
