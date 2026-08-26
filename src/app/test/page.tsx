import { getViewer } from "@/lib/viewer";
import { fetchQuestions } from "@/lib/questions";
import { NavShell } from "@/components/NavShell";
import { FullTestExam } from "@/components/exam/FullTestExam";

export default async function TestPage() {
  const { supabase, user, profile } = await getViewer();
  const allQuestions = await fetchQuestions(supabase, 200);

  return (
    <NavShell profile={profile} activeHref="/test">
      {!user && (
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12, maxWidth: 1500, marginLeft: "auto", marginRight: "auto" }}>
          Browsing as a guest — this run won&apos;t be saved to your progress.
        </p>
      )}
      <FullTestExam userId={user?.id ?? null} studentName={profile.displayName} allQuestions={allQuestions} />
    </NavShell>
  );
}
