import PageHeader from "@/components/PageHeader";
import LokiFlow from "@/components/LokiFlow";
import { listPlayers } from "@/lib/db/players";
import { listeventt } from "@/lib/db/events";

export default async function LokiPage() {
  const [players, eventt] = await Promise.all([listPlayers(), listeventt()]);
  const nextNumber = eventt.length + 1;

  return (
    <>
      <PageHeader title="Loki" subtitle="Uusi event ja pisteet" />
      <LokiFlow players={players} nextNumber={nextNumber} />
    </>
  );
}