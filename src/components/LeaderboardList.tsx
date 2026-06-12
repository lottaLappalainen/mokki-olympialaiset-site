import PlayerAvatar from "./PlayerAvatar";
import type { LeaderboardRow } from "@/lib/db/types";

// Medal/emoji per rank — 🥇🥈🥉 for the podium, a number badge otherwise.
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
      {/* Show the medal emoji for top 3, otherwise the plain number */}
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

  const [leader, ...rest] = rows;

  return (
    <div className="flex flex-col gap-3">
      {/* Leader — highlighted, with a crown and a slow shimmer sweep */}
      <div className="card-accent relative overflow-hidden flex items-center gap-4 animate-[pop_0.4s_ease-out]">
        {/* shimmer: a translucent band that sweeps across every few seconds */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full
                     bg-gradient-to-r from-transparent via-white/40 to-transparent
                     animate-[shimmer_4s_ease-in-out_infinite]"
        />
        <div className="relative shrink-0">
          <PlayerAvatar
            name={leader.name}
            photoUrl={leader.photo_url}
            seed={leader.player_id}
            size={64}
          />
          {/* crown bobbing above the leader's avatar */}
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl animate-[bob_2.5s_ease-in-out_infinite]">
            👑
          </span>
        </div>
        <div className="min-w-0 flex-1 relative">
          <p className="text-xs font-semibold text-wine">Kärjessä</p>
          <p className="text-xl font-bold text-ink truncate">{leader.name}</p>
        </div>
        <div className="text-right shrink-0 relative">
          <p className="text-3xl font-bold text-ink leading-none">
            {leader.total_points}
          </p>
          <p className="text-xs text-ink/70 mt-1">pistettä</p>
        </div>
      </div>

      {/* Everyone else — each row pops in, staggered by position */}
      {rest.map((row, i) => (
        <div
          key={row.player_id}
          className="card flex items-center gap-3 py-3 animate-[pop_0.4s_ease-out_both]"
          // stagger: row 1 starts at 50ms, row 2 at 100ms, etc.
          style={{ animationDelay: `${(i + 1) * 50}ms` }}
        >
          <RankBadge rank={i + 2} />
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
      ))}
    </div>
  );
}