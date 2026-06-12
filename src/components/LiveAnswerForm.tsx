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
  onDone: () => void;
}

export default function LiveAnswerForm({
  liveEventId,
  playerId,
  playerName,
  questions,
  onDone,
}: LiveAnswerFormProps) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [texts, setTexts] = useState<Record<string, string>>({});
  // photos are now an ARRAY per question (a photo question can need several)
  const [photos, setPhotos] = useState<Record<string, File[]>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

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

  const q = questions[i];
  const isLast = i === questions.length - 1;

  // How many photos this question needs (exactly N). Defaults to 1.
  const needPhotos = q.answer_type === "photo" ? q.photo_count ?? 1 : 0;
  const havePhotos = (photos[q.id] ?? []).length;

  // Can we leave the current question? Photo questions must have exactly N.
  const currentSatisfied =
    q.answer_type !== "photo" || havePhotos === needPhotos;

  function submit() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      for (const question of questions) {
        if (question.answer_type === "photo") {
          // append every file under the SAME key → server getAll() reads them
          for (const file of photos[question.id] ?? []) {
            fd.append(`q_${question.id}`, file);
          }
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

  // Guard the final save: every photo question must have exactly its count.
  function tryFinish() {
    const bad = questions.find(
      (question) =>
        question.answer_type === "photo" &&
        (photos[question.id] ?? []).length !== (question.photo_count ?? 1),
    );
    if (bad) {
      setError(
        `Lisää tarkalleen ${bad.photo_count ?? 1} kuvaa jokaiseen kuvakysymykseen.`,
      );
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
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
            onChange={(e) => setTexts((p) => ({ ...p, [q.id]: e.target.value }))}
          />
        )}
        {q.answer_type === "number" && (
          <input
            type="number"
            inputMode="numeric"
            className="input"
            placeholder="0"
            value={texts[q.id] ?? ""}
            onChange={(e) => setTexts((p) => ({ ...p, [q.id]: e.target.value }))}
          />
        )}
        {q.answer_type === "photo" && (
          <>
            <PhotoUploader
              multiple
              label={`Lisää kuva (${havePhotos}/${needPhotos})`}
              onFilesChange={(files) =>
                setPhotos((p) => ({ ...p, [q.id]: files }))
              }
            />
            {/* live count + warning when not yet exactly N */}
            <p
              className={`text-xs ${
                havePhotos === needPhotos ? "text-wine" : "text-ink/70"
              }`}
            >
              {havePhotos === needPhotos
                ? `Valmis — ${needPhotos} kuvaa.`
                : `Tarvitaan tarkalleen ${needPhotos} kuvaa (nyt ${havePhotos}).`}
            </p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        {i > 0 && (
          <button className="btn btn-soft flex-1" onClick={() => setI(i - 1)}>
            Edellinen
          </button>
        )}
        {!isLast ? (
          <button
            className="btn btn-primary flex-1 disabled:opacity-50"
            disabled={!currentSatisfied}
            onClick={() => setI(i + 1)}
          >
            Jatka
          </button>
        ) : (
          <button
            className="btn btn-primary flex-1 disabled:opacity-50"
            disabled={!currentSatisfied}
            onClick={tryFinish}
          >
            Tallenna
          </button>
        )}
      </div>

      <button className="btn btn-outline" onClick={onDone}>
        Peruuta
      </button>

      {error && <p className="text-wine font-medium">{error}</p>}

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