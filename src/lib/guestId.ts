// A persistent anonymous identifier for a guest browser, used everywhere
// Dashboard/Analytics need to group "this guest's" question attempts
// together (see db/migrations/0002_question_attempts.sql and
// src/lib/analytics.ts). Same cookie-based approach as
// src/lib/guestSettings.ts, for the same reason: it needs to be readable
// both by server-rendered pages (Dashboard, Analytics) and by client
// components (PracticeSession, FullTestExam) — localStorage can't do the
// former, and a signed-in student's real `user_id` replaces this entirely,
// never mixes with it (see the owner check in the migration).
//
// Deliberate limitation, not a bug: this identifies a *browser*, not a
// person. A new browser, a cleared cookie, or a private window all start a
// fresh guest history — there is no way to follow a guest across devices
// without an account. That's fine for now (auth is disabled site-wide);
// once sign-up returns, a signed-in student's attempts key off `user_id`
// instead and this identifier stops being used for them.

import { randomId } from "./id";

export const GUEST_ID_COOKIE = "orbit-guest-id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isValidGuestId(value: string | undefined | null): value is string {
  // Loose on purpose (just "non-empty, sane length") — this only ever
  // needs to be a stable opaque string, not necessarily a UUID.
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

/** Server-side (Server Components): reads the cookie already sent with the request. Never creates one — a Server Component can't reliably persist a new cookie back to the browser. */
export function readGuestIdCookie(raw: string | undefined): string | null {
  return isValidGuestId(raw) ? raw : null;
}

function readGuestIdCookieClient(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${GUEST_ID_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : undefined;
  return isValidGuestId(value) ? value : null;
}

/** Client-side: the SAME guest id every time this browser calls it — creates one only the first time it's ever needed. */
export function getOrCreateGuestIdClient(): string {
  const existing = readGuestIdCookieClient();
  if (existing) return existing;

  const id = randomId();
  document.cookie = `${GUEST_ID_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  return id;
}
