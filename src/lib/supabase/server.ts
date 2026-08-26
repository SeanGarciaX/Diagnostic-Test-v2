// Supabase client for use on the server (Server Components, Route
// Handlers). It reads the student's session from cookies so every query
// runs as that student — this is what makes the Row Level Security
// policies in db/migrations/0001_init.sql actually apply.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore because the middleware below refreshes the session too.
          }
        }
      }
    }
  );
}
