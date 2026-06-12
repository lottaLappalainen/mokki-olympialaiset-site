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
    { prompt: "", answer_type: "text", required: true, anonymous: false, photo_count: 1 },
  ]);
  const [hasVoting, setHasVoting] = useState(true); // voting on by default
  const [voteValues, setVoteValues] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!name.trim()) {
      setError("Anna tapahtumalle nimi.");
      return;
    }
    const realQuestions = questions.filter((q) => q.prompt.trim());
    if (realQuestions.length === 0) {
      setError("Lisää vähintään yksi kysymys.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        // pass the voting flag; auto-ends any currently-live event
        const { id } = await createLiveEvent(name, questions, hasVoting);

        // only store vote options if voting is on
        if (hasVoting) {
          const values = voteValues
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n));
          if (values.length) await createVoteOptions(id, values);
        }

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

      {/* Voting on/off */}
      <label className="card flex items-center justify-between">
        <span className="font-semibold text-ink">Äänestys käytössä</span>
        <input
          type="checkbox"
          checked={hasVoting}
          onChange={(e) => setHasVoting(e.target.checked)}
        />
      </label>

      {/* Vote values only matter when voting is on */}
      {hasVoting && (
        <div>
          <p className="text-sm font-semibold text-ink mb-2">Äänestyspisteet</p>
          <input
            className="input"
            placeholder="esim. 2, 4, 6, 8, 10"
            value={voteValues}
            onChange={(e) => setVoteValues(e.target.value)}
          />
          <p className="text-xs text-ink/70 mt-1">Pilkulla erotellut arvot.</p>
        </div>
      )}

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