// Every page under the nav shell calls this once to find out who's
// looking at the site. It never redirects — if nobody's signed in, it
// hands back a read-only "guest" profile instead, so every page still has
// something to render. Pages use `user` (not `profile`) to decide whether
// it's safe to read/write the database: a guest has a profile object to
// display, but no real Supabase session, so any write on their behalf
// would be rejected by Row Level Security anyway.
//
// TEMPORARY: sign-up is disabled as the front door while an account-
// creation bug is being fixed (see /sign-in and /sign-up, still reachable
// directly). Once that's sorted, swap this back to redirecting guests to
// /sign-in — see git history on this file for the previous version.

import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { fetchOrCreateProfile } from "./profile";
import { applyGuestSettings, GUEST_SETTINGS_COOKIE, parseGuestSettingsCookie } from "./guestSettings";
import { GUEST_ID_COOKIE, readGuestIdCookie } from "./guestId";
import type { StudentProfile } from "./types";

export const GUEST_PROFILE: StudentProfile = {
  id: "guest",
  displayName: "Guest",
  targetScore: 750,
  dailyQuestionGoal: 5,
  theme: "classic"
};

export async function getViewer() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    // A guest has no account row to read settings from, so anything they've
    // changed (see SettingsForm.tsx) lives in this cookie instead.
    const savedSettings = parseGuestSettingsCookie(cookies().get(GUEST_SETTINGS_COOKIE)?.value);
    // Same idea for analytics identity (see src/lib/guestId.ts) — null here
    // just means this browser hasn't answered a question yet, so there's
    // nothing to look up; it's created lazily, client-side, on first submit.
    const guestId = readGuestIdCookie(cookies().get(GUEST_ID_COOKIE)?.value);
    return { supabase, user: null, profile: applyGuestSettings(GUEST_PROFILE, savedSettings), guestId };
  }

  const profile = await fetchOrCreateProfile(supabase, user.id, user.user_metadata?.display_name as string | undefined);
  return { supabase, user, profile, guestId: null };
}
