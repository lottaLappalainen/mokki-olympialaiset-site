import { redirect } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import { getSpaceInfo } from "@/lib/db/reads";
import { listPlayers } from "@/lib/db/players";

export default async function PelaajatPage() {
  const [space, players] = await Promise.all([getSpaceInfo(), listPlayers()]);
  if (!space) redirect("/");

  return <ProfileView players={players} />;
}