// Reads and writes the one-row-per-student `profiles` table.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudentProfile, ThemeId } from "./types";

export async function fetchOrCreateProfile(
  supabase: SupabaseClient,
  userId: string,
  defaultDisplayName?: string
): Promise<StudentProfile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);

  if (data) {
    return {
      id: data.id,
      displayName: data.display_name,
      targetScore: data.target_score,
      dailyQuestionGoal: data.daily_question_goal,
      theme: data.theme as ThemeId
    };
  }

  // First time this student has logged in — create their profile row.
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId, display_name: defaultDisplayName || "Student" })
    .select("*")
    .single();

  if (insertError) throw new Error(`Could not create your profile: ${insertError.message}`);

  return {
    id: created.id,
    displayName: created.display_name,
    targetScore: created.target_score,
    dailyQuestionGoal: created.daily_question_goal,
    theme: created.theme as ThemeId
  };
}

export async function updateProfile(supabase: SupabaseClient, userId: string, changes: Partial<Omit<StudentProfile, "id">>) {
  const { error } = await supabase
    .from("profiles")
    .update({
      ...(changes.displayName !== undefined && { display_name: changes.displayName }),
      ...(changes.targetScore !== undefined && { target_score: changes.targetScore }),
      ...(changes.dailyQuestionGoal !== undefined && { daily_question_goal: changes.dailyQuestionGoal }),
      ...(changes.theme !== undefined && { theme: changes.theme })
    })
    .eq("id", userId);

  if (error) throw new Error(`Could not save your profile: ${error.message}`);
}
