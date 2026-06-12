"use client";

import PlayerAvatar from "@/components/PlayerAvatar";
import type { VoteResult } from "@/lib/db/liveEvents";

export default function VoteResults({ results }: { results: VoteResult[] }) {
  // results arrive best→worst; reverse so worst renders first and the
  // best lands last with the longest animation delay (the "reveal" build-up).
  const worstFirst = [...results].reverse();

  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-ink mb-1">Tulokset</p>
      {worstFirst.map((r, i) => (
        <div
          key={r.player_id}
          // each row pops in; later rows (= better placements) appear later
          className="card flex items-center gap-3 py-3 animate-[pop_0.4s_ease-out_both]"
          style={{ animationDelay: `${i * 250}ms` }}
        >
          {/* rank label: worstFirst is reversed, so real rank = total - i */}
          <span className="w-7 text-center font-bold text-wine shrink-0">
            {results.length - i}.
          </span>
          <PlayerAvatar
            name={r.player_name}
            photoUrl={r.photo_url}
            seed={r.player_id}
            size={44}
          />
          <span className="flex-1 min-w-0 font-semibold text-ink truncate">
            {r.player_name}
          </span>
          <span className="text-lg font-bold text-wine shrink-0">
            {r.total}
          </span>
        </div>
      ))}
    </div>
  );
}