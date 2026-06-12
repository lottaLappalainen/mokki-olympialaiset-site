"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import LiveQuestionEditor from "@/components/LiveQuestionEditor";
import {
  createLiveEvent,
  createVoteOptions,
  type QuestionDraft,
} from "@/lib/db/liveEvents";

export default function LiveEventBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { prompt: "", answer_type: "text", required: true, anonymous: false },
  ]);
  // Vote point values, typed comma-separated, e.g. "2, 4, 6, 8, 10".
  const [voteValues, setVoteValues] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!name.trim()) {
      setError("Anna tapahtumalle nimi.");
      return;
    }
    // Require at least one question with a non-empty prompt. Blank-prompt
    // questions get filtered out on the server, so without this an event
    // could be created with zero questions.
    const realQuestions = questions.filter((q) => q.prompt.trim());
    if (realQuestions.length === 0) {
      setError("Lisää vähintään yksi kysymys.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        // auto-ends any currently-live event
        const { id } = await createLiveEvent(name, questions);

        // parse "2,4,6" → [2,4,6]; store as this event's vote options
        const values = voteValues
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n));
        if (values.length) await createVoteOptions(id, values);

        router.push(`/o/historia/live/${id}`);
      } catch {
        setError("Tapahtuman luonti epäonnistui.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <input
        className="input text-lg"
        placeholder="Tapahtuman nimi"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
      />

      <div>
        <p className="text-sm font-semibold text-ink mb-2">Kysymykset</p>
        <LiveQuestionEditor questions={questions} onChange={setQuestions} />
      </div>

      {/* Vote point values for the reveal/voting phase */}
      <div>
        <p className="text-sm font-semibold text-ink mb-2">
          Äänestyspisteet (valinnainen)
        </p>
        <input
          className="input"
          placeholder="esim. 2, 4, 6, 8, 10"
          value={voteValues}
          onChange={(e) => setVoteValues(e.target.value)}
        />
        <p className="text-xs text-ink/70 mt-1">
          Pilkulla erotellut arvot. Jätä tyhjäksi jos et halua äänestystä.
        </p>
      </div>

      <p className="text-sm text-ink/80">
        Tallennus tekee tästä live-tapahtuman ja päättää mahdollisen aiemman
        live-tapahtuman.
      </p>

      <button className="btn btn-primary" onClick={save} disabled={isPending}>
        {isPending ? "Tallennetaan…" : "Tallenna ja käynnistä"}
      </button>
      {error && <p className="text-wine font-medium">{error}</p>}
    </div>
  );
}