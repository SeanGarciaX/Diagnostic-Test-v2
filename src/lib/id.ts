// A single place to generate opaque client-side ids (attempt ids, session
// ids). `crypto.randomUUID()` isn't guaranteed to exist in every JS
// runtime this app's Server Components render under, so every caller goes
// through this fallback-safe helper instead of calling it directly.

export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
