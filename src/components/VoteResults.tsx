"use client";

import PlayerAvatar from "@/components/PlayerAvatar";
import type { VoteResult } from "@/lib/db/liveEvents";

export default function VoteResults({ results }: { results: VoteResult[] }) {
  // results arrive best→worst. Render best at TOP, worst at BOTTOM.
  // Animation lands worst first (bottom) and finishes on the winner (top):
  // the LAST row gets the SHORTEST delay.
  const n = results.length;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-ink mb-1">Tulokset</p>
      {results.map((r, i) => {
        const delay = (n - 1 - i) * 250; // bottom-up reveal
        const isTop = i === 0;
        const isPodium = i < 3;
        return (
          <div
            key={r.player_id}
            className="card flex items-center gap-3 animate-[pop_0.4s_ease-out_both]"
            style={{
              animationDelay: `${delay}ms`,
              paddingTop: isTop ? 20 : isPodium ? 14 : 10,
              paddingBottom: isTop ? 20 : isPodium ? 14 : 10,
            }}
          >
            <span
              className="text-center font-bold text-wine shrink-0"
              style={{ width: 28, fontSize: isTop ? 22 : 16 }}
            >
              {i + 1}.
            </span>
            <PlayerAvatar
              name={r.player_name}
              photoUrl={r.photo_url}
              seed={r.player_id}
              size={isTop ? 64 : isPodium ? 52 : 40}
            />
            <span
              className="flex-1 min-w-0 font-semibold text-ink truncate"
              style={{ fontSize: isTop ? 20 : 16 }}
            >
              {r.player_name}
            </span>
            <span
              className="font-bold text-wine shrink-0"
              style={{ fontSize: isTop ? 24 : 18 }}
            >
              {r.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}