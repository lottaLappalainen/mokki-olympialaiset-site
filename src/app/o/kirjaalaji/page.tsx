import PageHeader from "@/components/PageHeader";
import LokiFlow from "@/components/LokiFlow";
import { listPlayers } from "@/lib/db/players";
import { listevents } from "@/lib/db/events";

export default async function LokiPage() {
  const [players, events] = await Promise.all([listPlayers(), listevents()]);
  const nextNumber = events.length + 1;

  return (
    <>
      <PageHeader title="Kirjaa uusi laji" />
      <LokiFlow players={players} nextNumber={nextNumber} />
    </>
  );
}