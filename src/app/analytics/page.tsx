import { getViewer } from "@/lib/viewer";
import { NavShell } from "@/components/NavShell";
import { DomainCard } from "@/components/analytics/DomainCard";
import { DomainComparison } from "@/components/analytics/DomainComparison";
import { DifficultyBreakdown } from "@/components/analytics/DifficultyBreakdown";
import { AccuracyOverTimeChart } from "@/components/analytics/AccuracyOverTimeChart";
import { WeeklyVolumeChart } from "@/components/analytics/WeeklyVolumeChart";
import { RecentMistakes } from "@/components/analytics/RecentMistakes";
import { AlienMascot } from "@/components/space/AlienMascot";
import {
  fetchDaily,
  fetchDifficultySummary,
  fetchDomainSummary,
  fetchRecentQuestionAttempts,
  fetchTotals,
  hasIdentity,
  lastNDayKeys
} from "@/lib/dashboardData";
import type { DailyStat, DifficultyStat, DomainStat, RecentQuestionAttempt, Totals } from "@/lib/dashboardData";
import type { Domain } from "@/lib/types";

const DOMAIN_ORDER: Domain[] = ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"];

export default async function AnalyticsPage() {
  const { user, profile, guestId, supabase } = await getViewer();
  const identity = { userId: user?.id ?? null, guestId };

  const [totalsResult, domainResult, difficultyResult, dailyResult, recentResult] = await Promise.all([
    fetchTotals(supabase, identity),
    fetchDomainSummary(supabase, identity),
    fetchDifficultySummary(supabase, identity),
    fetchDaily(supabase, identity, 30),
    fetchRecentQuestionAttempts(supabase, identity, 30)
  ]);

  return (
    <NavShell profile={profile} activeHref="/analytics">
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>Advanced Analytics</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: 28 }}>See where you&apos;re strongest and where you can improve.</p>

      {!totalsResult.ok || !domainResult.ok || !difficultyResult.ok || !dailyResult.ok || !recentResult.ok ? (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <strong style={{ color: "var(--danger)" }}>Analytics could not be loaded.</strong>{" "}
          <span style={{ color: "var(--text-muted)" }}>This is a connection problem, not missing data — try refreshing the page.</span>
        </div>
      ) : (
        <AnalyticsBody
          identity={identity}
          totals={totalsResult.data}
          domains={domainResult.data}
          difficulties={difficultyResult.data}
          daily={dailyResult.data}
          recent={recentResult.data}
        />
      )}
    </NavShell>
  );
}

function AnalyticsBody({
  identity,
  totals,
  domains,
  difficulties,
  daily,
  recent
}: {
  identity: { userId: string | null; guestId: string | null };
  totals: Totals;
  domains: DomainStat[];
  difficulties: DifficultyStat[];
  daily: DailyStat[];
  recent: RecentQuestionAttempt[];
}) {
  const hasAnyHistory = hasIdentity(identity) && totals.totalAttempts > 0;
  const byDomain = new Map(domains.map((d) => [d.domain, d]));
  const orderedDomains = DOMAIN_ORDER.map(
    (domain) => byDomain.get(domain) ?? { domain, attempts: 0, correct: 0, avgActiveSeconds: null }
  );

  if (!hasAnyHistory) {
    return (
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <AlienMascot size={64} />
        <div>
          <strong>No practice recorded yet.</strong>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>
            Complete a few practice questions and this page will fill in with your real domain breakdown, trends, and recent mistakes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>SAT Math domain performance</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {orderedDomains.map((d) => (
            <DomainCard key={d.domain} domain={d.domain} attempts={d.attempts} correct={d.correct} avgActiveSeconds={d.avgActiveSeconds} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <DomainComparison domains={orderedDomains} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 28 }}>
        <DifficultyBreakdown rows={difficulties} />
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 16 }}>Weekly practice volume</h2>
          <p style={{ marginTop: 0, marginBottom: 8, fontSize: 13, color: "var(--text-muted)" }}>Questions answered per week, last 5 weeks.</p>
          <WeeklyVolumeChart days={daily} weeks={5} />
        </div>
      </section>

      <section className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 16 }}>Accuracy over time</h2>
        <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "var(--text-muted)" }}>Last 30 days</p>
        <AccuracyOverTimeChart days={daily} dayKeys={lastNDayKeys(30)} />
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 16 }}>Recent mistakes</h2>
        <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "var(--text-muted)" }}>Your most recent incorrect answers — good candidates for review.</p>
        <RecentMistakes attempts={recent} />
      </section>
    </div>
  );
}
