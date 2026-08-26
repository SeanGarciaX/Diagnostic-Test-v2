// Lets a guest (no Supabase account) change their settings and actually
// see them stick — there's no database row to write to without a real
// session, so this is stored in a small cookie instead. A cookie (not
// localStorage) is what lets both the server-rendered pages (which pick
// the theme colors, greeting name, etc.) and the client-side settings
// form read the same value.
//
// This never touches a signed-in student's real profile — once someone
// has an account, fetchOrCreateProfile/updateProfile (src/lib/profile.ts)
// take over completely.

import { getTheme, THEMES } from "./theme";
import type { StudentProfile, ThemeId } from "./types";

export const GUEST_SETTINGS_COOKIE = "orbit-guest-settings";

export type GuestSettingsPatch = Partial<Pick<StudentProfile, "displayName" | "targetScore" | "dailyQuestionGoal" | "theme">>;

/** Keeps values sane regardless of where they came from (a hand-edited cookie, a stale format, etc). */
function sanitize(patch: unknown): GuestSettingsPatch {
  if (!patch || typeof patch !== "object") return {};
  const value = patch as Record<string, unknown>;
  const result: GuestSettingsPatch = {};

  if (typeof value.displayName === "string" && value.displayName.trim()) {
    result.displayName = value.displayName.trim().slice(0, 60);
  }
  if (typeof value.targetScore === "number" && Number.isFinite(value.targetScore)) {
    result.targetScore = Math.min(800, Math.max(400, Math.round(value.targetScore)));
  }
  if (typeof value.dailyQuestionGoal === "number" && Number.isFinite(value.dailyQuestionGoal)) {
    result.dailyQuestionGoal = Math.min(50, Math.max(1, Math.round(value.dailyQuestionGoal)));
  }
  if (typeof value.theme === "string" && THEMES.some((theme) => theme.id === value.theme)) {
    result.theme = value.theme as ThemeId;
  }

  return result;
}

/** Server-side: parse the cookie's raw value (already URL-decoded by Next's cookie store) into a patch. */
export function parseGuestSettingsCookie(raw: string | undefined): GuestSettingsPatch {
  if (!raw) return {};
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Applies a guest's saved settings on top of the default guest profile. */
export function applyGuestSettings(base: StudentProfile, patch: GuestSettingsPatch): StudentProfile {
  return {
    ...base,
    ...(patch.displayName !== undefined && { displayName: patch.displayName }),
    ...(patch.targetScore !== undefined && { targetScore: patch.targetScore }),
    ...(patch.dailyQuestionGoal !== undefined && { dailyQuestionGoal: patch.dailyQuestionGoal }),
    ...(patch.theme !== undefined && { theme: getTheme(patch.theme).id })
  };
}

/** Client-side: reads the cookie directly (used before merging in a new change). */
function readGuestSettingsCookieClient(): GuestSettingsPatch {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(new RegExp(`(?:^|; )${GUEST_SETTINGS_COOKIE}=([^;]*)`));
  if (!match) return {};
  try {
    return sanitize(JSON.parse(decodeURIComponent(match[1])));
  } catch {
    return {};
  }
}

/** Client-side: merges `changes` into whatever the guest already had saved and writes the cookie. */
export function saveGuestSettings(changes: GuestSettingsPatch) {
  const merged = sanitize({ ...readGuestSettingsCookieClient(), ...changes });
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${GUEST_SETTINGS_COOKIE}=${encodeURIComponent(JSON.stringify(merged))}; path=/; max-age=${oneYear}; SameSite=Lax`;
}
