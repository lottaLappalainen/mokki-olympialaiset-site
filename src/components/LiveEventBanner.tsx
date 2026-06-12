"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import type { LiveEvent } from "@/lib/db/liveEvents";

// The shining "join the live event" banner shown on the main page in place
// of the carousel whenever a live event is running.
export default function LiveEventBanner({ live }: { live: LiveEvent }) {
  return (
    // Tapping it opens the live event's view. The slow glow pulse comes from
    // @keyframes glow in globals.css.
    <Link
      href={`/o/historia/live/${live.id}`}
      className="block rounded-2xl p-5 mb-5 text-center text-paper
                 bg-wine animate-[glow_2.8s_ease-in-out_infinite]"
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        {/* pinging live dot */}
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-paper opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-paper" />
        </span>
        <Radio size={18} />
        <span className="text-xs font-bold uppercase tracking-wide">Live</span>
      </div>
      <p className="text-xl font-extrabold">Liity live-tapahtumaan</p>
      <p className="text-sm opacity-90 mt-0.5">{live.name}</p>
    </Link>
  );
}