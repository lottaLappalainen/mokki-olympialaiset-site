import Link from "next/link";
import { Radio } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import LokiFlow from "@/components/LokiFlow";
import { listPlayers } from "@/lib/db/players";
import { listevents } from "@/lib/db/events";
import { listPointOptions } from "@/lib/db/settings";
import { getLiveEvent } from "@/lib/db/liveEvents";

export default async function LokiPage() {
  const [players, events, pointOptions, live] = await Promise.all([
    listPlayers(),
    listevents(),
    listPointOptions(),
    getLiveEvent(), // the single live event, or null
  ]);
  const nextNumber = events.length + 1;

  return (
    <>
      <PageHeader title="Kirjaa uusi laji" />

      {/* Live-event builder entry. Disabled while a live event is running,
          since only one can be live at a time. */}
      {live ? (
        <div className="mb-5">
          <button
            disabled
            className="btn btn-accent w-full opacity-60 cursor-not-allowed"
          >
            <Radio size={18} />
            Live-tapahtuma käynnissä
          </button>
          <Link
            href={`/o/historia/live/${live.id}`}
            className="block text-center text-sm text-wine font-medium mt-2 underline"
          >
            Siirry käynnissä olevaan tapahtumaan
          </Link>
        </div>
      ) : (
        <Link href="/o/kirjaalaji/live" className="btn btn-accent w-full mb-5">
          <Radio size={18} />
          Luo live-tapahtuma
        </Link>
      )}

      <LokiFlow
        players={players}
        nextNumber={nextNumber}
        pointOptions={pointOptions}
      />
    </>
  );
}