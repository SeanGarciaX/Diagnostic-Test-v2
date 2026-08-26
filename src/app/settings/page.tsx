import { requireUser } from "@/lib/requireUser";
import { fetchOrCreateProfile } from "@/lib/profile";
import { NavShell } from "@/components/NavShell";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const profile = await fetchOrCreateProfile(supabase, user.id);

  return (
    <NavShell profile={profile} activeHref="/settings">
      <h1 style={{ marginTop: 0 }}>Settings</h1>
      <SettingsForm profile={profile} />
    </NavShell>
  );
}
