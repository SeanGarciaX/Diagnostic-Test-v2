import { getViewer } from "@/lib/viewer";
import { fetchQuestions, pickPracticeSet } from "@/lib/questions";
import { NavShell } from "@/components/NavShell";
import { ExamSimulation } from "@/components/ExamSimulation";

const MODULE_SIZE = 22;

export default async function TestPage() {
  const { supabase, user, profile } = await getViewer();
  const allQuestions = await fetchQuestions(supabase, 200);
  const moduleQuestions = pickPracticeSet(allQuestions, null, MODULE_SIZE);

  return (
    <NavShell profile={profile} activeHref="/test">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Full Test — Module 1</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          {MODULE_SIZE} questions, 35 minutes, real testing conditions.{" "}
          {user ? "Your results are saved to your progress automatically." : "Browsing as a guest — this run won't be saved."}
        </p>
        <ExamSimulation userId={user?.id ?? null} questions={moduleQuestions} />
      </div>
    </NavShell>
  );
}
