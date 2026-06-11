import PlayerAvatar from "./PlayerAvatar";
import type { LeaderboardRow } from "@/lib/db/types";

function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: "bg-wine text-paper",
    2: "bg-teal-600 text-paper",
    3: "bg-teal-400 text-ink",
  };
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        styles[rank] ?? "bg-surface text-teal-600"
      }`}
    >
      {rank}
    </div>
  );
}

export default function LeaderboardList({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card text-center text-teal-600">
        Ei vielä pelaajia. Lisää pelaajia profiilista.
      </div>
    );
  }

  const [leader, ...rest] = rows;

  return (
    <div className="flex flex-col gap-3">
      {/* Leader — highlighted */}
      <div className="card-accent flex items-center gap-4">
        <PlayerAvatar name={leader.name} photoUrl={leader.photo_url} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-wine">Kärjessä</p>
          <p className="text-xl font-bold text-ink truncate">{leader.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-ink leading-none">
            {leader.total_points}
          </p>
          <p className="text-xs text-teal-600 mt-1">pistettä</p>
        </div>
      </div>

      {/* Everyone else */}
      {rest.map((row, i) => (
        <div
          key={row.player_id}
          className="card flex items-center gap-3 py-3"
        >
          <RankBadge rank={i + 2} />
          <PlayerAvatar name={row.name} photoUrl={row.photo_url} size={44} />
          <p className="flex-1 min-w-0 font-semibold text-ink truncate">
            {row.name}
          </p>
          <p className="text-lg font-bold text-teal-600 shrink-0">
            {row.total_points}
          </p>
        </div>
      ))}
    </div>
  );
}