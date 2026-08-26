"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/profile";
import { THEMES } from "@/lib/theme";
import type { StudentProfile, ThemeId } from "@/lib/types";

export function SettingsForm({ profile }: { profile: StudentProfile }) {
  const supabase = createClient();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [targetScore, setTargetScore] = useState(profile.targetScore);
  const [dailyQuestionGoal, setDailyQuestionGoal] = useState(profile.dailyQuestionGoal);
  const [theme, setTheme] = useState<ThemeId>(profile.theme);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await updateProfile(supabase, profile.id, { displayName, targetScore, dailyQuestionGoal, theme });
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <div className="field">
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="targetScore">Target Math score</label>
        <select id="targetScore" value={targetScore} onChange={(event) => setTargetScore(Number(event.target.value))}>
          {[550, 600, 650, 700, 750, 800].map((score) => (
            <option key={score} value={score}>
              {score}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="dailyGoal">Daily question goal</label>
        <select id="dailyGoal" value={dailyQuestionGoal} onChange={(event) => setDailyQuestionGoal(Number(event.target.value))}>
          {[5, 10, 15, 20].map((count) => (
            <option key={count} value={count}>
              {count} questions
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Theme</label>
        <div style={{ display: "flex", gap: 10 }}>
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: `2px solid ${theme === option.id ? option.accent : "var(--surface-border)"}`,
                background: option.pageBackground,
                textAlign: "left"
              }}
            >
              <span style={{ display: "block", width: 20, height: 20, borderRadius: "50%", background: option.accent, marginBottom: 8 }} />
              <strong style={{ color: option.recommendedMode === "dark" ? "#fff" : "#111" }}>{option.name}</strong>
            </button>
          ))}
        </div>
      </div>

      <button className="button-primary" onClick={save}>
        Save changes
      </button>
      {saved && <span style={{ marginLeft: 12, color: "var(--success)", fontSize: 13 }}>Saved</span>}
    </div>
  );
}
