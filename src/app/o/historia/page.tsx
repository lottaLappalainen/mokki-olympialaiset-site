import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { listevents } from "@/lib/db/events";
import { listEndedLiveEvents } from "@/lib/db/liveEvents";
import { colorFromSeed } from "@/lib/avatarColor";

export default async function LajitPage() {
  const [events, endedLive] = await Promise.all([
    listevents(),
    listEndedLiveEvents(),
  ]);

  const isEmpty = events.length === 0 && endedLive.length === 0;

  return (
    <>
      <PageHeader
        title="Lajit"
        right={
          <Link href="/o/kirjaalaji" className="btn btn-primary px-3">
            <Plus size={18} />
            Uusi laji
          </Link>
        }
      />

      {isEmpty ? (
        <div className="card text-center text-ink">
          Ei vielä lajeja. Luo ensimmäinen Uusi laji -painikkeella.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => {
            const color = colorFromSeed(event.id);
            // cover_url = chosen cover, else first photo (wired in listevents)
            const cover = event.cover_url ?? event.photos[0]?.url ?? null;
            return (
              <Link
                key={event.id}
                href={`/o/historia/${event.id}`}
                className="card card-link flex items-center gap-3 py-3"
              >
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-xl object-cover bg-surface shrink-0"
                  />
                ) : (
                  <div
                    style={{ backgroundColor: color.bg, color: color.text }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0"
                  >
                    {event.ordinal}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-wine">
                    Laji {event.ordinal}
                  </p>
                  <p className="font-semibold text-ink truncate">{event.name}</p>
                </div>
                <ChevronRight size={20} className="text-wine shrink-0" />
              </Link>
            );
          })}

          {endedLive.map((live) => (
            <Link
              key={live.id}
              href={`/o/historia/live/${live.id}`}
              className="rounded-2xl bg-ink text-paper p-3 flex items-center gap-3
                         transition-colors hover:bg-ink/90 active:bg-ink/80"
            >
              <div className="w-12 h-12 rounded-xl bg-paper/15 flex items-center justify-center shrink-0">
                <span className="text-lg">●</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-mint-100">
                  Päättynyt laji
                </p>
                <p className="font-semibold truncate">{live.name}</p>
              </div>
              <ChevronRight size={20} className="text-mint-100 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}