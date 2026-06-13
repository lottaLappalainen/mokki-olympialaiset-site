import { notFound } from "next/navigation";
import { getEventDetail } from "@/lib/db/reads";
import { listPointOptions } from "@/lib/db/settings";
import { listEventStats } from "@/lib/db/eventStats";
import EventDetailView from "@/components/EventDetailView";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, pointOptions, stats] = await Promise.all([
    getEventDetail(id),
    listPointOptions(),
    listEventStats(id),
  ]);
  if (!detail) notFound();

  return (
    <EventDetailView detail={detail} pointOptions={pointOptions} stats={stats} />
  );
}