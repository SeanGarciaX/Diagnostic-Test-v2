import { getViewer } from "@/lib/viewer";
import { NavShell } from "@/components/NavShell";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const { user, profile } = await getViewer();

  return (
    <NavShell profile={profile} activeHref="/settings">
      <h1 style={{ marginTop: 0 }}>Settings</h1>
      <SettingsForm profile={profile} isGuest={!user} />
    </NavShell>
  );
}
