import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { listevents } from "@/lib/db/events";

export default async function historyPage() {
  const events = await listevents();

  return (
    <>
      <PageHeader title="Historia" subtitle={`${events.length} lajit`} />

      {events.length === 0 ? (
        <div className="card text-center text-teal-600">
          Ei vielä lajeja. Luo ensimmäinen Loki-välilehdeltä.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/o/historia/${event.id}`}
              className="card flex items-center gap-3 py-3"
            >
              {event.photos[0]?.url ? (
                <img
                  src={event.photos[0].url}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover bg-surface shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-wine font-bold shrink-0">
                  {event.ordinal}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-wine">
                  event {event.ordinal}
                </p>
                <p className="font-semibold text-ink truncate">{event.name}</p>
              </div>
              <ChevronRight size={20} className="text-teal-600 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}