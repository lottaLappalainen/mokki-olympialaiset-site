import { notFound } from "next/navigation";
import PlayerDetailView from "@/components/PlayerDetailView";
import { getPlayerDetail } from "@/lib/db/reads";

export default async function PelaajaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPlayerDetail(id);
  if (!detail) notFound();

  return <PlayerDetailView detail={detail} />;
}