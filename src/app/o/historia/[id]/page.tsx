import { notFound } from "next/navigation";
import { getEventDetail } from "@/lib/db/reads";
import EventDetailView from "@/components/EventDetailView";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getEventDetail(id);
  if (!detail) notFound();

  return <EventDetailView detail={detail} />;
}