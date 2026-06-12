"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import PhotoUploader from "@/components/PhotoUploader";
import PointSelect from "@/components/PointSelect";
import { createevent, addeventPhoto } from "@/lib/db/events";
import { setScores } from "@/lib/db/scores";
import type { Player } from "@/lib/db/types";
import type { PointOption } from "@/lib/db/settings";

type Step = "name" | "details" | "scoring";

interface LokiFlowProps {
  players: Player[];
  nextNumber: number;
  pointOptions: PointOption[]; // when non-empty, scoring uses a dropdown
}

export default function LokiFlow({
  players,
  nextNumber,
  pointOptions,
}: LokiFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Prefill from a "Kirjaa laji" handoff (e.g. from an ended live event) ──
  // URL shape: /o/kirjaalaji?name=Tietovisa&points={"<playerId>":12,...}
  // Prefills the name and each player's points; everything stays editable.
  useEffect(() => {
    const prefName = searchParams.get("name");
    const prefPoints = searchParams.get("points");
    if (prefName) setName(prefName);
    if (prefPoints) {
      try {
        const parsed = JSON.parse(prefPoints) as Record<string, number>;
        // store as strings, since the inputs are text
        const asStrings: Record<string, string> = {};
        for (const [pid, val] of Object.entries(parsed)) {
          asStrings[pid] = String(val);
        }
        setPoints(asStrings);
      } catch {
        // bad/garbled param → ignore, just don't prefill points
      }
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1 → 2
  function goToDetails() {
    if (!name.trim()) {
      setError("Anna lajille nimi.");
      return;
    }
    setError(null);
    setStep("details");
  }

  // Step 2 → save laji + photos → 3
  function saveEvent() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await createevent(name);
        for (const file of photos) {
          const fd = new FormData();
          fd.append("photo", file);
          await addeventPhoto(id, fd);
        }
        setEventId(id);
        setStep("scoring");
      } catch {
        setError("Lajin tallennus epäonnistui.");
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
        {/* "event N" → "Laji N" */}
        <p className="text-sm font-semibold text-wine">Laji {nextNumber}</p>
        <input
          className="input text-lg"
          placeholder="Lajin nimi (esim. Mölkky)"
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
          <p className="text-sm font-semibold text-wine">Laji {nextNumber}</p>
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
          onClick={saveEvent}
          disabled={isPending}
        >
          {isPending ? "Tallennetaan…" : "Tallenna laji"}
        </button>
        {error && <p className="text-wine font-medium">{error}</p>}
      </div>
    );
  }

  // step === "scoring"
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-wine">
        Laji {nextNumber} · {name}
      </p>
      <p className="text-ink font-semibold">Syötä pisteet</p>

      {players.length === 0 && (
        // on-background text → ink, not the blue teal-600
        <p className="text-ink">
          Ei pelaajia. Lisää pelaajia Pelaajat-sivulta ensin.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <div key={p.id} className="card flex items-center gap-3 py-3">
            <PlayerAvatar
              name={p.name}
              photoUrl={p.photo_url}
              seed={p.id}
              size={40}
            />
            <span className="flex-1 min-w-0 font-semibold text-ink truncate">
              {p.name}
            </span>
            {/* dropdown when point options are configured, else free number */}
            <PointSelect
              options={pointOptions}
              value={points[p.id] ?? ""}
              onChange={(v) =>
                setPoints((prev) => ({ ...prev, [p.id]: v }))
              }
              className="w-24"
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