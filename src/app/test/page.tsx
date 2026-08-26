import { requireUser } from "@/lib/requireUser";
import { fetchOrCreateProfile } from "@/lib/profile";
import { fetchQuestions, pickPracticeSet } from "@/lib/questions";
import { NavShell } from "@/components/NavShell";
import { ExamSimulation } from "@/components/ExamSimulation";

const MODULE_SIZE = 22;

export default async function TestPage() {
  const { supabase, user } = await requireUser();
  const profile = await fetchOrCreateProfile(supabase, user.id);
  const allQuestions = await fetchQuestions(supabase, 200);
  const moduleQuestions = pickPracticeSet(allQuestions, null, MODULE_SIZE);

  return (
    <NavShell profile={profile} activeHref="/test">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Full Test — Module 1</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          {MODULE_SIZE} questions, 35 minutes, real testing conditions. Your results are saved to your progress automatically.
        </p>
        <ExamSimulation userId={user.id} questions={moduleQuestions} />
      </div>
    </NavShell>
  );
}
