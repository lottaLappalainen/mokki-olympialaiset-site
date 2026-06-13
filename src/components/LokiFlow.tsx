"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import PhotoUploader from "@/components/PhotoUploader";
import PointSelect from "@/components/PointSelect";
import { createevent, addeventPhoto } from "@/lib/db/events";
import { setScores } from "@/lib/db/scores";
import { saveEventStats, type StatDraft } from "@/lib/db/eventStats";
import type { Player } from "@/lib/db/types";
import type { PointOption } from "@/lib/db/settings";

type Step = "name" | "order" | "stats" | "scoring" | "photos";

interface LokiFlowProps {
  players: Player[];
  nextNumber: number;
  pointOptions: PointOption[];
}

// Stable shuffle so the random order doesn't reshuffle on every render.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  const [points, setPoints] = useState<Record<string, string>>({});
  // per-player stats: note text + an optional photo file
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [statPhotos, setStatPhotos] = useState<Record<string, File | null>>({});
  const [photos, setPhotos] = useState<File[]>([]); // the laji's own photos
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Random play order, computed once. Reused for the stats + scoring lists.
  const ordered = useMemo(() => shuffle(players), [players]);

  // Prefill name + points from a "Kirjaa laji" handoff (voting live events).
  useEffect(() => {
    const prefName = searchParams.get("name");
    const prefPoints = searchParams.get("points");
    if (prefName) setName(prefName);
    if (prefPoints) {
      try {
        const parsed = JSON.parse(prefPoints) as Record<string, number>;
        const asStrings: Record<string, string> = {};
        for (const [pid, val] of Object.entries(parsed)) {
          asStrings[pid] = String(val);
        }
        setPoints(asStrings);
      } catch {
        /* ignore bad param */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Final save: create the event, then write photos, stats, and scores.
  function finish() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await createevent(name);

        // laji photos
        for (const file of photos) {
          const fd = new FormData();
          fd.append("photo", file);
          await addeventPhoto(id, fd);
        }

        // per-player stats (note and/or photo); empties are skipped server-side
        const stats: StatDraft[] = players.map((p) => ({
          playerId: p.id,
          note: notes[p.id] ?? "",
          photo: statPhotos[p.id] ?? null,
        }));
        await saveEventStats(id, stats);

        // scores
        const entries = players.map((p) => ({
          playerId: p.id,
          points: parseInt(points[p.id] ?? "", 10) || 0,
        }));
        await setScores(id, entries);

        router.push("/o");
      } catch {
        setError("Tallennus epäonnistui.");
      }
    });
  }

  // ── Step 1: name ──────────────────────────────────────────────────────────
  if (step === "name") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-wine">Laji {nextNumber}</p>
        <input
          className="input text-lg"
          placeholder="Lajin nimi (esim. Mölkky)"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) setStep("order");
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!name.trim()) return setError("Anna lajille nimi.");
            setError(null);
            setStep("order");
          }}
        >
          Jatka
        </button>
        {error && <p className="text-wine font-medium">{error}</p>}
      </div>
    );
  }

  // ── Step 2: random play order (display only) ──────────────────────────────
  if (step === "order") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-wine">Laji {nextNumber} · {name}</p>
        <p className="text-ink font-semibold">Random generoitu pelijärjestys:</p>
        <div className="flex flex-col gap-2">
          {ordered.map((p, i) => (
            <div key={p.id} className="card flex items-center gap-3 py-3">
              <span className="w-7 text-center font-bold text-wine shrink-0">
                {i + 1}.
              </span>
              <PlayerAvatar name={p.name} photoUrl={p.photo_url} seed={p.id} size={40} />
              <span className="flex-1 min-w-0 font-semibold text-ink truncate">
                {p.name}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-soft flex-1" onClick={() => setStep("name")}>
            Edellinen
          </button>
          <button className="btn btn-primary flex-1" onClick={() => setStep("stats")}>
            Jatka
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: per-player stats (optional photo and/or text) ─────────────────
  if (step === "stats") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-wine">Laji {nextNumber} · {name}</p>
        <p className="text-ink font-semibold">
          Pelikohtaiset stätsit (vapaaehtoinen)
        </p>
        <div className="flex flex-col gap-3">
          {ordered.map((p) => (
            <div key={p.id} className="card flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <PlayerAvatar name={p.name} photoUrl={p.photo_url} seed={p.id} size={40} />
                <span className="flex-1 min-w-0 font-semibold text-ink truncate">
                  {p.name}
                </span>
              </div>
              <textarea
                className="input min-h-16 py-2"
                placeholder="Teksti (vapaaehtoinen)"
                value={notes[p.id] ?? ""}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
              />
              <PhotoUploader
                label="Lisää kuva"
                onFilesChange={(files) =>
                  setStatPhotos((prev) => ({ ...prev, [p.id]: files[0] ?? null }))
                }
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-soft flex-1" onClick={() => setStep("order")}>
            Edellinen
          </button>
          <button className="btn btn-primary flex-1" onClick={() => setStep("scoring")}>
            Jatka
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4: points ────────────────────────────────────────────────────────
  if (step === "scoring") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-wine">Laji {nextNumber} · {name}</p>
        <p className="text-ink font-semibold">Syötä pisteet</p>
        {players.length === 0 && (
          <p className="text-ink">Ei pelaajia. Lisää pelaajia Pelaajat-sivulta ensin.</p>
        )}
        <div className="flex flex-col gap-2">
          {ordered.map((p) => (
            <div key={p.id} className="card flex items-center gap-3 py-3">
              <PlayerAvatar name={p.name} photoUrl={p.photo_url} seed={p.id} size={40} />
              <span className="flex-1 min-w-0 font-semibold text-ink truncate">
                {p.name}
              </span>
              <PointSelect
                options={pointOptions}
                value={points[p.id] ?? ""}
                onChange={(v) => setPoints((prev) => ({ ...prev, [p.id]: v }))}
                className="w-24"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-soft flex-1" onClick={() => setStep("stats")}>
            Edellinen
          </button>
          <button className="btn btn-primary flex-1" onClick={() => setStep("photos")}>
            Jatka
          </button>
        </div>
      </div>
    );
  }

  // ── Step 5: laji photos → final save ──────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-semibold text-wine">Laji {nextNumber} · {name}</p>
      <div>
        <p className="text-sm font-semibold text-ink mb-2">Kuvat</p>
        <PhotoUploader multiple onFilesChange={setPhotos} />
      </div>
      <div className="flex gap-2">
        <button
          className="btn btn-soft flex-1"
          onClick={() => setStep("scoring")}
          disabled={isPending}
        >
          Edellinen
        </button>
        <button className="btn btn-primary flex-1" onClick={finish} disabled={isPending}>
          {isPending ? "Tallennetaan…" : "Tallenna laji"}
        </button>
      </div>
      {error && <p className="text-wine font-medium">{error}</p>}
    </div>
  );
}