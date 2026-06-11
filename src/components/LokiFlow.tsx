"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import PhotoUploader from "@/components/PhotoUploader";
import { createevent, addeventPhoto } from "@/lib/db/events";
import { setScores } from "@/lib/db/scores";
import type { Player } from "@/lib/db/types";

type Step = "name" | "details" | "scoring";

interface LokiFlowProps {
  players: Player[];
  nextNumber: number;
}

export default function LokiFlow({ players, nextNumber }: LokiFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [eventId, seteventId] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Step 1 → 2
  function goToDetails() {
    if (!name.trim()) {
      setError("Anna eventlle nimi.");
      return;
    }
    setError(null);
    setStep("details");
  }

  // Step 2 → save event + photos → 3
  function saveevent() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await createevent(name);
        for (const file of photos) {
          const fd = new FormData();
          fd.append("photo", file);
          await addeventPhoto(id, fd);
        }
        seteventId(id);
        setStep("scoring");
      } catch {
        setError("eventn tallennus epäonnistui.");
      }
    });
  }

  // Step 3 → save everyone's points → leaderboard
  function saveScores() {
    if (!eventId) return;
    setError(null);
    startTransition(async () => {
      try {
        const entries = players.map((p) => ({
          playerId: p.id,
          points: parseInt(points[p.id] ?? "", 10) || 0,
        }));
        await setScores(eventId, entries);
        router.push("/o");
      } catch {
        setError("Pisteiden tallennus epäonnistui.");
      }
    });
  }

  if (step === "name") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-wine">event {nextNumber}</p>
        <input
          className="input text-lg"
          placeholder="eventn nimi (esim. Mölkky)"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && goToDetails()}
        />
        <button className="btn btn-primary" onClick={goToDetails}>
          Jatka
        </button>
        {error && <p className="text-wine font-medium">{error}</p>}
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-wine">event {nextNumber}</p>
          <input
            className="input text-xl font-bold mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-ink mb-2">Kuvat</p>
          <PhotoUploader multiple onFilesChange={setPhotos} />
        </div>

        <button
          className="btn btn-primary"
          onClick={saveevent}
          disabled={isPending}
        >
          {isPending ? "Tallennetaan…" : "Tallenna event"}
        </button>
        {error && <p className="text-wine font-medium">{error}</p>}
      </div>
    );
  }

  // step === "scoring"
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-wine">
        event {nextNumber} · {name}
      </p>
      <p className="text-ink font-semibold">Syötä pisteet</p>

      {players.length === 0 && (
        <p className="text-teal-600">
          Ei pelaajia. Lisää pelaajia profiilista ensin.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <div key={p.id} className="card flex items-center gap-3 py-3">
            <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={40} />
            <span className="flex-1 min-w-0 font-semibold text-ink truncate">
              {p.name}
            </span>
            <input
              type="number"
              inputMode="numeric"
              className="input w-20 text-center"
              placeholder="0"
              value={points[p.id] ?? ""}
              onChange={(e) =>
                setPoints((prev) => ({ ...prev, [p.id]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary"
        onClick={saveScores}
        disabled={isPending}
      >
        {isPending ? "Tallennetaan…" : "Tallenna pisteet"}
      </button>
      {error && <p className="text-wine font-medium">{error}</p>}
    </div>
  );
}