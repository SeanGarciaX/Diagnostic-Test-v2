import Link from "next/link";
import type { CSSProperties } from "react";
import { getTheme, readableTextColor } from "@/lib/theme";
import type { StudentProfile } from "@/lib/types";
import { signOut } from "@/app/(auth)/actions";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/practice", label: "Practice" },
  { href: "/test", label: "Full Test" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" }
];

export function NavShell({
  profile,
  activeHref,
  children
}: {
  profile: StudentProfile;
  activeHref: string;
  children: React.ReactNode;
}) {
  const theme = getTheme(profile.theme);
  const isGuest = profile.id === "guest";
  const shellStyle: CSSProperties = {
    "--accent": theme.accent,
    "--accent-text": readableTextColor(theme.accent),
    "--nav-bg": theme.navBackground,
    "--nav-text": readableTextColor(theme.navBackground),
    "--page-bg": theme.pageBackground,
    minHeight: "100vh",
    display: "flex",
    background: "var(--page-bg)"
  } as CSSProperties;

  return (
    <div data-theme={theme.id} style={shellStyle}>
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: "var(--nav-bg)",
          color: "var(--nav-text)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 24
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 20, paddingLeft: 8 }}>orbit</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                textDecoration: "none",
                color: "inherit",
                fontWeight: activeHref === link.href ? 700 : 500,
                background: activeHref === link.href ? "rgba(255,255,255,0.12)" : "transparent"
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: "auto", fontSize: 13, opacity: 0.85 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{profile.displayName}</div>
          {isGuest ? (
            <Link href="/sign-up" style={{ color: "inherit", opacity: 0.75 }}>
              Create account →
            </Link>
          ) : (
            <form action={signOut}>
              <button type="submit" style={{ background: "none", border: "none", color: "inherit", padding: 0, opacity: 0.75, fontSize: 13 }}>
                Sign out
              </button>
            </form>
          )}
        </div>
      </aside>
      <main style={{ flex: 1, padding: "32px 40px", color: "var(--text)" }}>{children}</main>
    </div>
  );
}
