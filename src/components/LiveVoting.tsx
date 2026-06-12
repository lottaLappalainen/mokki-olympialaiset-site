"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhotoLightbox from "@/components/PhotoLightbox";
import { submitVotes, type RevealQuestion } from "@/lib/db/liveEvents";

interface LiveVotingProps {
  liveEventId: string;
  voterId: string;
  questions: RevealQuestion[]; // grouped answers, per question
  options: { id: string; value: number }[];
  onDone: () => void;
}

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
  questions,
  options,
  onDone,
}: LiveVotingProps) {
  const router = useRouter();

  const shuffledByQuestion = useMemo(
    () =>
      questions.map((q) => ({
        question: q,
        answers: shuffled(q.answers, voterId + q.id),
      })),
    [questions, voterId],
  );

  const [ballot, setBallot] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  // lightbox holds a list of photos + the index tapped (so multi-photo answers
  // open as a swipeable set)
  const [lightbox, setLightbox] = useState<{ urls: string[]; at: number } | null>(
    null,
  );
  const [busy, startTransition] = useTransition();

  function setVote(answerId: string, value: string) {
    setBallot((prev) => ({ ...prev, [answerId]: value }));
  }

  function usedInQuestion(answerIds: string[]): Set<string> {
    const used = new Set<string>();
    for (const aid of answerIds) {
      const v = ballot[aid];
      if (v) used.add(v);
    }
    return used;
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
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-wine">Äänestä</p>
        <p className="text-ink text-sm">
          Anna jokaiselle vastaukselle pisteet. Voit käyttää kunkin pistemäärän
          kerran per kysymys.
        </p>
      </div>

      {shuffledByQuestion.map(({ question, answers }) => {
        const answerIds = answers.map((a) => a.answer_id);
        const used = usedInQuestion(answerIds);
        return (
          <div key={question.id} className="flex flex-col gap-2">
            <p className="font-semibold text-ink">{question.prompt}</p>
            {answers.map((a, idx) => {
              const mine = ballot[a.answer_id] ?? "";
              const photos = a.photo_urls ?? [];
              return (
                <div key={a.answer_id} className="card flex items-center gap-3">
                  <span className="text-xs font-bold text-wine shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {photos.length > 0 ? (
                      // show ALL photos for this answer
                      <div className="grid grid-cols-3 gap-1">
                        {photos.map((url, pi) => (
                          <img
                            key={pi}
                            src={url}
                            alt=""
                            loading="lazy"
                            onClick={() => setLightbox({ urls: photos, at: pi })}
                            className="w-full aspect-square object-cover rounded-lg cursor-pointer"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-ink truncate">{a.text}</p>
                    )}
                  </div>
                  <select
                    className="input w-20 shrink-0"
                    value={mine}
                    onChange={(e) => setVote(a.answer_id, e.target.value)}
                  >
                    <option value="">–</option>
                    {options
                      .filter(
                        (o) =>
                          !used.has(String(o.value)) ||
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
        );
      })}

      <div className="flex flex-col gap-2">
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
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Tallenna äänet?"
        message="Voit tallentaa äänesi nyt."
        busy={busy}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.urls.map((url, i) => ({ url, name: `kuva-${i + 1}.jpg` }))}
          startIndex={lightbox.at}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}