"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhotoLightbox from "@/components/PhotoLightbox";
import { submitVotes } from "@/lib/db/liveEvents";

export interface VotableAnswer {
  answer_id: string;
  text: string | null;
  photo_url: string | null;
}

interface LiveVotingProps {
  liveEventId: string;
  voterId: string;
  answers: VotableAnswer[]; // anonymous, already photo-signed
  options: { id: string; value: number }[];
  onDone: () => void;
}

// Stable shuffle seeded by voterId so the order doesn't reshuffle on re-render.
function shuffled<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 5381;
  for (const c of seed) h = (h * 33) ^ c.charCodeAt(0);
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 33) % 2147483647;
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LiveVoting({
  liveEventId,
  voterId,
  answers,
  options,
  onDone,
}: LiveVotingProps) {
  const router = useRouter();
  const ordered = useMemo(() => shuffled(answers, voterId), [answers, voterId]);
  // answer_id → chosen value (as string; "" = none)
  const [ballot, setBallot] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  // values already used somewhere in the ballot (each option once)
  const usedValues = new Set(Object.values(ballot).filter((v) => v !== ""));

  function setVote(answerId: string, value: string) {
    setBallot((prev) => ({ ...prev, [answerId]: value }));
  }

  function save() {
    startTransition(async () => {
      const clean: Record<string, number> = {};
      for (const [aid, v] of Object.entries(ballot)) {
        if (v !== "") clean[aid] = parseInt(v, 10);
      }
      await submitVotes(liveEventId, voterId, clean);
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-wine">Äänestä</p>
      <p className="text-ink text-sm">
        Anna jokaiselle vastaukselle pisteet. Voit käyttää kunkin pistemäärän
        vain kerran.
      </p>

      <div className="flex flex-col gap-2">
        {ordered.map((a, idx) => {
          const mine = ballot[a.answer_id] ?? "";
          return (
            <div key={a.answer_id} className="card flex items-center gap-3">
              <span className="text-xs font-bold text-wine shrink-0">
                #{idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                {a.photo_url ? (
                  <img
                    src={a.photo_url}
                    alt=""
                    loading="lazy"
                    onClick={() => setLightboxUrl(a.photo_url)}
                    className="w-full h-24 object-cover rounded-lg cursor-pointer"
                  />
                ) : (
                  <p className="text-ink truncate">{a.text}</p>
                )}
              </div>
              {/* dropdown shows only unused options (plus the current pick) */}
              <select
                className="input w-20 shrink-0"
                value={mine}
                onChange={(e) => setVote(a.answer_id, e.target.value)}
              >
                <option value="">–</option>
                {options
                  .filter(
                    (o) =>
                      !usedValues.has(String(o.value)) ||
                      String(o.value) === mine,
                  )
                  .map((o) => (
                    <option key={o.id} value={String(o.value)}>
                      {o.value}
                    </option>
                  ))}
              </select>
            </div>
          );
        })}
      </div>

      <button
        className="btn btn-primary"
        disabled={busy}
        onClick={() => setConfirmOpen(true)}
      >
        Tallenna äänet
      </button>
      <button className="btn btn-outline" onClick={onDone}>
        Peruuta
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Tallenna äänet?"
        message="Voit tallentaa äänesi nyt."
        busy={busy}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Tap a photo → open it big */}
      {lightboxUrl && (
        <PhotoLightbox
          photos={[{ url: lightboxUrl, name: "kuva.jpg" }]}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  );
}