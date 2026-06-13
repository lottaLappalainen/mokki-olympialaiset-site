import PlayerAvatar from "./PlayerAvatar";
import type { LeaderboardRow } from "@/lib/db/types";

// Medal/style per rank — 🥇🥈🥉 for the podium, a plain number badge otherwise.
function rankDisplay(rank: number): { emoji: string | null; className: string } {
  switch (rank) {
    case 1:
      return { emoji: "🥇", className: "bg-wine text-paper" };
    case 2:
      return { emoji: "🥈", className: "bg-teal-600 text-paper" };
    case 3:
      return { emoji: "🥉", className: "bg-teal-400 text-ink" };
    default:
      return { emoji: null, className: "bg-mint-100 text-ink" };
  }
}

function RankBadge({ rank }: { rank: number }) {
  const { emoji, className } = rankDisplay(rank);
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${className}`}
    >
      {emoji ?? rank}
    </div>
  );
}

export default function LeaderboardList({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card text-center text-ink flex flex-col items-center gap-2 py-8">
        <span className="text-4xl">🏆</span>
        <p>Ei vielä pelaajia. Lisää pelaajia Pelaajat-sivulta.</p>
      </div>
    );
  }

  // Sort by points desc (in case the source isn't already), then assign
  // competition ranks: a player's rank = 1 + how many players have strictly
  // more points. Ties share a rank; the next distinct score skips ranks.
  // e.g. 6,6,4 → ranks 1,1,3.
  const sorted = [...rows].sort((a, b) => b.total_points - a.total_points);
  const ranked = sorted.map((row) => ({
    row,
    rank: 1 + sorted.filter((r) => r.total_points > row.total_points).length,
  }));

  return (
    <div className="flex flex-col gap-3">
      {ranked.map(({ row, rank }, i) => {
        const isLeader = rank === 1; // every rank-1 player (incl. ties) is a leader
        if (isLeader) {
          // Leader styling: accent card, crown, shimmer. Shared by all who
          // tie for first.
          return (
            <div
              key={row.player_id}
              className="card-accent relative overflow-hidden flex items-center gap-4 animate-[pop_0.4s_ease-out_both]"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full
                           bg-gradient-to-r from-transparent via-white/40 to-transparent
                           animate-[shimmer_4s_ease-in-out_infinite]"
              />
              <div className="relative shrink-0">
                <PlayerAvatar
                  name={row.name}
                  photoUrl={row.photo_url}
                  seed={row.player_id}
                  size={64}
                />
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl animate-[bob_2.5s_ease-in-out_infinite]">
                  👑
                </span>
              </div>
              <div className="min-w-0 flex-1 relative">
                <p className="text-xs font-semibold text-wine">Kärjessä</p>
                <p className="text-xl font-bold text-ink truncate">{row.name}</p>
              </div>
              <div className="text-right shrink-0 relative">
                <p className="text-3xl font-bold text-ink leading-none">
                  {row.total_points}
                </p>
                <p className="text-xs text-ink/70 mt-1">pistettä</p>
              </div>
            </div>
          );
        }

        // Everyone else: a normal row whose badge shows the (possibly tied) rank.
        return (
          <div
            key={row.player_id}
            className="card flex items-center gap-3 py-3 animate-[pop_0.4s_ease-out_both]"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <RankBadge rank={rank} />
            <PlayerAvatar
              name={row.name}
              photoUrl={row.photo_url}
              seed={row.player_id}
              size={44}
            />
            <p className="flex-1 min-w-0 font-semibold text-ink truncate">
              {row.name}
            </p>
            <p className="text-lg font-bold text-wine shrink-0">
              {row.total_points}
            </p>
          </div>
        );
      })}
    </div>
  );
}