import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileView from "@/components/ProfileView";
import { getSpaceInfo } from "@/lib/db/reads";
import { listPlayers } from "@/lib/db/players";

export default async function ProfiiliPage() {
  const [space, players] = await Promise.all([getSpaceInfo(), listPlayers()]);
  if (!space) redirect("/");

  return (
    <>
      <PageHeader title="Profiili" />
      <ProfileView code={space.code} players={players} />
    </>
  );
}