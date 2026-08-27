import { RocketIcon } from "@/components/space/RocketIcon";
import { PlanetIcon } from "@/components/space/PlanetIcon";
import { StarField } from "@/components/space/StarField";

export function DailyMission({ completed, goal }: { completed: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0;
  const remaining = Math.max(0, goal - completed);
  const done = completed >= goal && goal > 0;

  return (
    <div className="card" style={{ position: "relative", overflow: "hidden" }}>
      <StarField height={36} />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: 0.5 }}>TODAY&apos;S MISSION</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {completed} / {goal} questions
        </span>
      </div>

      <div style={{ position: "relative", marginTop: 18, marginBottom: 10 }}>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "var(--surface-border)",
            overflow: "visible",
            position: "relative"
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 999,
              background: "var(--accent)",
              transition: "width 0.3s ease"
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${pct}%`,
              transform: "translate(-50%, -50%)"
            }}
          >
            <RocketIcon size={26} />
          </div>
          <div style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)" }}>
            <PlanetIcon size={22} />
          </div>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
        {done
          ? "Mission complete — great work today! 🎉"
          : remaining === goal
            ? `${goal} question${goal === 1 ? "" : "s"} to complete today's mission.`
            : `${remaining} more question${remaining === 1 ? "" : "s"} until today's mission is complete!`}
      </p>
    </div>
  );
}
