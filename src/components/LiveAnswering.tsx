"use client";

import { useState } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";
import LiveAnswerForm from "@/components/LiveAnswerForm";
import type { LiveEvent } from "@/lib/db/liveEvents";
import type { Player } from "@/lib/db/types";
import type { RevealQuestion } from "@/lib/db/liveEvents";

interface LiveAnsweringProps {
  detail: LiveEvent;
  players: Player[];
  answeredIds: string[];      // players who've finished
  reveal: RevealQuestion[] | null; // non-null when event.revealed
}

export default function LiveAnswering({
  detail,
  players,
  answeredIds,
  reveal,
}: LiveAnsweringProps) {
  const [answering, setAnswering] = useState<Player | null>(null);
  const done = new Set(answeredIds);

  // ── Reveal mode: 2-column grid of answers per question ──────────────────
  if (reveal) {
    return (
      <div className="flex flex-col gap-6">
        {reveal.map((q) => (
          <div key={q.id}>
            <p className="font-semibold text-ink mb-2">{q.prompt}</p>
            {/* 2×2 uniform square tiles */}
            <div className="grid grid-cols-2 gap-2">
              {q.answers.map((a) => (
                <div
                  key={a.player_id}
                  className="card aspect-square flex flex-col gap-1 overflow-hidden"
                >
                  {/* name hidden for anonymous questions (wiring kept simple) */}
                  {!q.anonymous && (
                    <p className="text-xs font-semibold text-wine truncate">
                      {a.player_name}
                    </p>
                  )}
                  {a.photo_url ? (
                    <img
                      src={a.photo_url}
                      alt=""
                      loading="lazy"
                      className="flex-1 w-full object-cover rounded-lg"
                    />
                  ) : (
                    <p className="text-ink text-sm overflow-y-auto flex-1">
                      {a.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Answering mode: player tiles, styled by answered/not ────────────────
  if (answering) {
    return (
      <LiveAnswerForm
        liveEventId={detail.id}
        playerId={answering.id}
        playerName={answering.name}
        questions={detail.questions}
        onDone={() => setAnswering(null)}
      />
    );
  }

  return (
    <>
      <p className="text-ink mb-3">Napauta kuvaasi vastataksesi.</p>
      <div className="grid grid-cols-3 gap-3">
        {players.map((p) => {
          const answered = done.has(p.id);
          return (
            <button
              key={p.id}
              // answered players are locked out + visually distinct (dimmed,
              // wine ring); not-answered are full-color and tappable.
              disabled={answered}
              onClick={() => setAnswering(p)}
              className={`flex flex-col items-center gap-1 ${
                answered ? "opacity-50" : ""
              }`}
            >
              <div
                className={`rounded-full ${
                  answered ? "ring-2 ring-wine" : "ring-2 ring-transparent"
                }`}
              >
                <PlayerAvatar
                  name={p.name}
                  photoUrl={p.photo_url}
                  seed={p.id}
                  size={72}
                />
              </div>
              <span className="text-xs font-medium text-ink text-center truncate w-full">
                {p.name}
              </span>
              {answered && (
                <span className="text-[10px] font-bold text-wine">Valmis</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}