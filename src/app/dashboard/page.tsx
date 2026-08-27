import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { NavShell } from "@/components/NavShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { DailyMission } from "@/components/dashboard/DailyMission";
import { RecentPerformanceChart } from "@/components/dashboard/RecentPerformanceChart";
import { AlienMascot } from "@/components/space/AlienMascot";
import {
  accuracyPercent,
  currentStreak,
  fetchDaily,
  fetchTotals,
  formatDuration,
  hasIdentity,
  lastNDayKeys,
  dailyRowFor,
  sumDailyWindow,
  todayKey
} from "@/lib/dashboardData";

export default async function DashboardPage() {
  const { user, profile, guestId, supabase } = await getViewer();
  const identity = { userId: user?.id ?? null, guestId };

  // 35 days of daily rows covers the 7-day chart plus enough history for a
  // multi-week streak — still a tiny, pre-aggregated result set, not the
  // student's full raw history (see src/lib/dashboardData.ts). Both
  // functions already turn a failed query into { ok: false } rather than
  // throwing, so the page can render a real error state instead of crashing.
  const [totalsResult, dailyResult] = await Promise.all([fetchTotals(supabase, identity), fetchDaily(supabase, identity, 35)]);

  return (
    <NavShell profile={profile} activeHref="/dashboard">
      <DashboardBody profile={profile} isGuest={!user} identity={identity} totalsResult={totalsResult} dailyResult={dailyResult} />
    </NavShell>
  );
}

// Kept as a separate function (rather than inlined above) purely so the
// query wiring above stays readable — this is still one Server Component,
// not a client boundary.
async function DashboardBody({
  profile,
  isGuest,
  identity,
  totalsResult,
  dailyResult
}: {
  profile: { displayName: string; dailyQuestionGoal: number };
  isGuest: boolean;
  identity: { userId: string | null; guestId: string | null };
  totalsResult: Awaited<ReturnType<typeof fetchTotals>>;
  dailyResult: Awaited<ReturnType<typeof fetchDaily>>;
}) {
  if (!totalsResult.ok || !dailyResult.ok) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Welcome back, {profile.displayName}.</h1>
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <strong style={{ color: "var(--danger)" }}>Analytics could not be loaded.</strong>{" "}
          <span style={{ color: "var(--text-muted)" }}>
            This is a connection problem, not missing data — try refreshing the page.
          </span>
        </div>
      </div>
    );
  }

  const totals = totalsResult.data;
  const daily = dailyResult.data;
  const hasAnyHistory = hasIdentity(identity) && totals.totalAttempts > 0;

  const today = todayKey();
  const todayRow = dailyRowFor(daily, today);
  const week = sumDailyWindow(daily, 6);
  const weekAccuracy = accuracyPercent(week.correct, week.attempts);
  const todayAccuracy = accuracyPercent(todayRow.correct, todayRow.attempts);
  const overallAccuracy = accuracyPercent(totals.totalCorrect, totals.totalAttempts);
  const avgTimePerQuestion = totals.totalAttempts > 0 ? totals.totalActiveSeconds / totals.totalAttempts : null;
  const streak = currentStreak(daily);
  const last7Keys = lastNDayKeys(7);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 4 }}>Welcome back, {profile.displayName}.</h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            {todayRow.attempts > 0
              ? `You've answered ${todayRow.attempts} question${todayRow.attempts === 1 ? "" : "s"} today${todayAccuracy !== null ? ` at ${todayAccuracy}% accuracy` : ""}.`
              : "No questions answered yet today — a short session keeps your momentum going."}
          </p>
        </div>
        <Link href="/analytics" className="button-secondary" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
          View Advanced Analytics
        </Link>
      </div>

      {isGuest && (
        <div className="card" style={{ marginTop: 20, marginBottom: 8, borderColor: "var(--accent)" }}>
          <strong>You&apos;re browsing as a guest.</strong>{" "}
          <span style={{ color: "var(--text-muted)" }}>
            Your practice is tracked on this browser only — clearing site data or switching devices starts fresh.
          </span>{" "}
          <Link href="/sign-up">Create an account</Link> to keep it permanently.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 24, marginBottom: 16 }}>
        <StatCard label="Problems completed today" value={String(todayRow.attempts)} />
        <StatCard
          label="Accuracy"
          value={overallAccuracy === null ? "—" : `${overallAccuracy}%`}
          sublabel={totals.totalAttempts > 0 ? `${totals.totalCorrect} / ${totals.totalAttempts} correct` : undefined}
        />
        <StatCard label="Average time per question" value={avgTimePerQuestion === null ? "—" : formatDuration(avgTimePerQuestion)} />
        <StatCard label="Practice time today" value={formatDuration(todayRow.activeSeconds)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard
          label="This week"
          value={String(week.attempts)}
          sublabel={weekAccuracy === null ? "questions answered" : `${weekAccuracy}% accuracy`}
        />
        <StatCard label="Practice streak" value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "—"} />
        <StatCard label="Total problems completed" value={String(totals.totalAttempts)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
        <DailyMission completed={todayRow.attempts} goal={profile.dailyQuestionGoal} />

        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 16 }}>Recent performance</h2>
          <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "var(--text-muted)" }}>Accuracy over the last 7 days</p>
          <RecentPerformanceChart days={daily} dayKeys={last7Keys} />
        </div>
      </div>

      {!hasAnyHistory && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <AlienMascot size={48} />
          <div>
            <strong>No practice recorded yet.</strong>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>
              Complete a few practice questions to start tracking your progress — everything above will fill in automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
