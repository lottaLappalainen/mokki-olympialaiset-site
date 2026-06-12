"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { submitLiveAnswers, type LiveQuestion } from "@/lib/db/liveEvents";

interface LiveAnswerFormProps {
  liveEventId: string;
  playerId: string;
  playerName: string;
  questions: LiveQuestion[];
  onDone: () => void; // close the form (back to the tile grid)
}

export default function LiveAnswerForm({
  liveEventId,
  playerId,
  playerName,
  questions,
  onDone,
}: LiveAnswerFormProps) {
  const router = useRouter();
  const [i, setI] = useState(0); // current question index
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      for (const question of questions) {
        if (question.answer_type === "photo") {
          const file = photos[question.id];
          if (file) fd.append(`q_${question.id}`, file);
        } else {
          fd.append(`q_${question.id}`, texts[question.id] ?? "");
        }
      }
      const res = await submitLiveAnswers(liveEventId, playerId, fd);
      if (res?.error) {
        setError(res.error);
        setConfirmOpen(false);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  // Guard: an event with no questions would make questions[i] undefined and
  // crash on q.prompt. Show a friendly message instead of rendering the form.
  if (questions.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-ink">Tällä tapahtumalla ei ole kysymyksiä.</p>
        <button className="btn btn-outline" onClick={onDone}>
          Takaisin
        </button>
      </div>
    );
  }

  // Safe below: questions.length > 0
  const q = questions[i];
  const isLast = i === questions.length - 1;

  return (
    <div className="flex flex-col gap-4">
      {/* progress */}
      <p className="text-sm font-semibold text-wine">
        {playerName} · Kysymys {i + 1} / {questions.length}
      </p>

      <div className="card flex flex-col gap-3">
        <p className="font-semibold text-ink">{q.prompt}</p>

        {q.answer_type === "text" && (
          <textarea
            className="input min-h-24 py-2"
            placeholder="Vastauksesi"
            value={texts[q.id] ?? ""}
            onChange={(e) =>
              setTexts((p) => ({ ...p, [q.id]: e.target.value }))
            }
          />
        )}
        {q.answer_type === "number" && (
          <input
            type="number"
            inputMode="numeric"
            className="input"
            placeholder="0"
            value={texts[q.id] ?? ""}
            onChange={(e) =>
              setTexts((p) => ({ ...p, [q.id]: e.target.value }))
            }
          />
        )}
        {q.answer_type === "photo" && (
          <PhotoUploader
            label="Lisää kuva"
            onFilesChange={(files) =>
              setPhotos((p) => ({ ...p, [q.id]: files[0] ?? null }))
            }
          />
        )}
      </div>

      {/* nav: back (within form) / continue / final save */}
      <div className="flex gap-2">
        {i > 0 && (
          <button className="btn btn-soft flex-1" onClick={() => setI(i - 1)}>
            Edellinen
          </button>
        )}
        {!isLast ? (
          <button className="btn btn-primary flex-1" onClick={() => setI(i + 1)}>
            Jatka
          </button>
        ) : (
          <button
            className="btn btn-primary flex-1"
            onClick={() => setConfirmOpen(true)}
          >
            Tallenna
          </button>
        )}
      </div>

      <button className="btn btn-outline" onClick={onDone}>
        Peruuta
      </button>

      {error && <p className="text-wine font-medium">{error}</p>}

      {/* Unmissable final-save warning — answers can't be edited after */}
      <ConfirmDialog
        open={confirmOpen}
        title="Tallenna vastaukset?"
        message="Vastauksia EI voi muokata tallennuksen jälkeen."
        confirmLabel="Tallenna lopullisesti"
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}