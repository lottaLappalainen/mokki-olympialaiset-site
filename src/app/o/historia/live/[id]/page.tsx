import { notFound } from "next/navigation";
import LiveEventView from "@/components/LiveEventView";
import {
  getLiveEventDetail,
  getAnsweredPlayerIds,
  getVotedPlayerIds,
  getLiveReveal,
  getVoteResults,
  listVoteOptions,
} from "@/lib/db/liveEvents";
import { listPlayers } from "@/lib/db/players";

export default async function LiveEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // If this returns null, the row either doesn't exist OR belongs to another
  // space (scoped query) OR the select errored on a missing column.
  const detail = await getLiveEventDetail(id);
  if (!detail) notFound();

  // Phase-dependent data. Reveal/vote data only matter once revealed.
  const [players, answeredIds, votedIds, reveal, voteOptions, voteResults] =
    await Promise.all([
      listPlayers(),
      getAnsweredPlayerIds(id),
      getVotedPlayerIds(id),
      detail.revealed ? getLiveReveal(id) : Promise.resolve(null),
      listVoteOptions(id),
      detail.revealed ? getVoteResults(id) : Promise.resolve([]),
    ]);

  return (
    <LiveEventView
      detail={detail}
      players={players}
      answeredIds={answeredIds}
      votedIds={votedIds}
      reveal={reveal}
      voteOptions={voteOptions}
      voteResults={voteResults}
    />
  );
}