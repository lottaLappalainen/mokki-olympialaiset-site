"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, Trash2, ClipboardList } from "lucide-react";
import LiveQuestionEditor from "@/components/LiveQuestionEditor";
import ConfirmDialog from "@/components/ConfirmDialog";
import PlayerAvatar from "@/components/PlayerAvatar";
import LiveAnswerForm from "@/components/LiveAnswerForm";
import LiveVoting, { type VotableAnswer } from "@/components/LiveVoting";
import VoteResults from "@/components/VoteResults";
import {
  setLiveEventLive,
  setLiveEventRevealed,
  setLiveEventResultsRevealed,
  replaceLiveQuestions,
  deleteLiveEvent,
  type LiveEvent,
  type QuestionDraft,
  type RevealQuestion,
  type VoteResult,
} from "@/lib/db/liveEvents";
import type { Player } from "@/lib/db/types";

interface PendingAction {
  title: string;
  message?: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

interface LiveEventViewProps {
  detail: LiveEvent;
  players: Player[];
  answeredIds: string[];
  votedIds: string[];
  reveal: RevealQuestion[] | null; // non-null once revealed
  voteOptions: { id: string; value: number }[];
  voteResults: VoteResult[];
}

const BACK_HREF = "/o/historia";

export default function LiveEventView({
  detail,
  players,
  answeredIds,
  votedIds,
  reveal,
  voteOptions,
  voteResults,
}: LiveEventViewProps) {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, startTransition] = useTransition();

  // Which player is currently answering / voting (honor system: you tap a tile)
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);

  const [questions, setQuestions] = useState<QuestionDraft[]>(
    detail.questions.map((q) => ({
      prompt: q.prompt,
      answer_type: q.answer_type,
      required: q.required,
      anonymous: q.anonymous,
      photo_count: q.photo_count ?? undefined,
    })),
  );

  const answered = new Set(answeredIds);
  const voted = new Set(votedIds);
  const everyoneAnswered =
    players.length > 0 && answeredIds.length >= players.length;
  const everyoneVoted =
    players.length > 0 && votedIds.length >= players.length;

  // Voting only matters when the event has it AND answers are revealed.
  const votingActive = detail.has_voting && detail.revealed;

  function confirmRun() {
    if (!pending) return;
    startTransition(async () => {
      await pending.run();
      setPending(null);
      router.refresh();
    });
  }

  // Anonymous votable list from the reveal data — uses the REAL answer_id.
  const votable: VotableAnswer[] = (reveal ?? []).flatMap((q) =>
    q.answers.map((a) => ({
      answer_id: a.answer_id,
      text: a.text,
      photo_url: a.photo_url,
    })),
  );

  // ── Active player is answering (pre-reveal) or voting (reveal + has_voting) ─
  if (activePlayer) {
    if (!detail.revealed) {
      return (
        <LiveAnswerForm
          liveEventId={detail.id}
          playerId={activePlayer.id}
          playerName={activePlayer.name}
          questions={detail.questions}
          onDone={() => setActivePlayer(null)}
        />
      );
    }
    // revealed + voting on → vote; (no-voting events never set activePlayer here)
    return (
      <LiveVoting
        liveEventId={detail.id}
        voterId={activePlayer.id}
        answers={votable}
        options={voteOptions}
        onDone={() => setActivePlayer(null)}
      />
    );
  }

  return (
    <>

      {/* Title + status + settings */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink break-words">
            {detail.name}
          </h1>
          <span
            className={`inline-block mt-1 text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
              detail.is_live ? "bg-wine text-paper" : "bg-ink text-paper"
            }`}
          >
            {detail.is_live ? "Live" : "Päättynyt"}
          </span>
        </div>
        <button
          aria-label="Asetukset"
          className="btn btn-outline px-3 shrink-0"
          onClick={() => setShowSettings((s) => !s)}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ── MAIN AREA (when not in settings) ──────────────────────────────── */}
      {!showSettings && (
        <>
          {/* RESULTS — only after results_revealed (voting events only) */}
          {detail.has_voting &&
            detail.results_revealed &&
            voteResults.length > 0 && (
              <div className="mb-6">
                <VoteResults results={voteResults} />
              </div>
            )}

          {/* REVEAL (no voting): just show each question's answers, 2 per row,
              photo on top, no name. */}
          {detail.revealed && !detail.has_voting && reveal && (
            <div className="flex flex-col gap-6 mb-6">
              {reveal.map((q) => (
                <div key={q.id}>
                  <p className="font-semibold text-ink mb-2">{q.prompt}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.answers.map((a) => (
                      <div
                        key={a.answer_id}
                        className="card flex flex-col gap-1 overflow-hidden"
                      >
                        {a.photo_url ? (
                          <img
                            src={a.photo_url}
                            alt=""
                            loading="lazy"
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                        ) : (
                          <p className="text-ink text-sm">{a.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PLAYER TILES — answering, or voting (only when voting is active
              and results aren't revealed yet). Hidden once results are out. */}
          {!(detail.has_voting && detail.results_revealed) && (
            <>
              <p className="text-ink mb-3">
                {votingActive
                  ? "Napauta kuvaasi äänestääksesi."
                  : "Napauta kuvaasi vastataksesi."}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {players.map((p) => {
                  // before reveal: done = answered.
                  // voting active: done = voted.
                  const done = votingActive
                    ? voted.has(p.id)
                    : answered.has(p.id);
                  // no-voting + revealed: nothing left to do — disable taps.
                  const disabled =
                    done || (detail.revealed && !detail.has_voting);
                  return (
                    <button
                      key={p.id}
                      disabled={disabled}
                      onClick={() => setActivePlayer(p)}
                      className={`flex flex-col items-center gap-1 ${
                        disabled ? "opacity-50" : ""
                      }`}
                    >
                      <div
                        className={`rounded-full ring-2 ${
                          done
                            ? votingActive
                              ? "ring-teal-600" // voted
                              : "ring-wine" // answered
                            : "ring-transparent"
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
                      {done && (
                        <span className="text-[10px] font-bold text-wine">
                          {votingActive ? "Äänestetty" : "Valmis"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── SETTINGS ──────────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="flex flex-col gap-5">
          {/* Live toggle */}
          <div className="card flex items-center justify-between">
            <span className="font-semibold text-ink">Live käynnissä</span>
            <button
              role="switch"
              aria-checked={detail.is_live}
              onClick={() =>
                setPending({
                  title: detail.is_live
                    ? "Päätä live-tapahtuma?"
                    : "Käynnistä uudelleen?",
                  message: detail.is_live
                    ? "Tapahtuma siirtyy historiaan päättyneenä."
                    : "Tämä päättää mahdollisen muun live-tapahtuman.",
                  run: () => setLiveEventLive(detail.id, !detail.is_live),
                })
              }
              className={`w-12 h-7 rounded-full transition-colors relative ${
                detail.is_live ? "bg-wine" : "bg-mint-100"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-paper transition-all ${
                  detail.is_live ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Reveal answers — enabled once everyone has answered */}
          <div className="card flex items-center justify-between">
            <div>
              <span className="font-semibold text-ink">Paljasta vastaukset</span>
              {!everyoneAnswered && (
                <p className="text-xs text-ink/70">
                  Kaikkien on ensin vastattava.
                </p>
              )}
            </div>
            <button
              role="switch"
              aria-checked={detail.revealed}
              disabled={!everyoneAnswered && !detail.revealed}
              onClick={() =>
                setPending({
                  title: detail.revealed
                    ? "Piilota vastaukset?"
                    : "Paljasta vastaukset?",
                  run: () => setLiveEventRevealed(detail.id, !detail.revealed),
                })
              }
              className={`w-12 h-7 rounded-full transition-colors relative disabled:opacity-40 ${
                detail.revealed ? "bg-wine" : "bg-mint-100"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-paper transition-all ${
                  detail.revealed ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Reveal results — voting events only, enabled once everyone voted */}
          {detail.has_voting && (
            <div className="card flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink">Paljasta tulokset</span>
                {!everyoneVoted && (
                  <p className="text-xs text-ink/70">
                    Kaikkien on ensin äänestettävä.
                  </p>
                )}
              </div>
              <button
                role="switch"
                aria-checked={detail.results_revealed}
                disabled={!everyoneVoted && !detail.results_revealed}
                onClick={() =>
                  setPending({
                    title: detail.results_revealed
                      ? "Piilota tulokset?"
                      : "Paljasta tulokset?",
                    run: () =>
                      setLiveEventResultsRevealed(
                        detail.id,
                        !detail.results_revealed,
                      ),
                  })
                }
                className={`w-12 h-7 rounded-full transition-colors relative disabled:opacity-40 ${
                  detail.results_revealed ? "bg-wine" : "bg-mint-100"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-paper transition-all ${
                    detail.results_revealed ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Kirjaa laji — moved here from the results area. Prefills the
              scored-laji form. With voting: each player's total vote points.
              Without voting: just the name (points left blank/editable). */}
          <Link
            href={`/o/kirjaalaji?name=${encodeURIComponent(detail.name)}${
              detail.has_voting && voteResults.length > 0
                ? `&points=${encodeURIComponent(
                    JSON.stringify(
                      Object.fromEntries(
                        voteResults.map((r) => [r.player_id, r.total]),
                      ),
                    ),
                  )}`
                : ""
            }`}
            className="btn btn-primary w-full"
          >
            <ClipboardList size={18} />
            Kirjaa laji
          </Link>

          {/* Edit questions */}
          <div>
            <p className="text-sm font-semibold text-ink mb-2">
              Muokkaa kysymyksiä
            </p>
            <LiveQuestionEditor questions={questions} onChange={setQuestions} />
            <button
              className="btn btn-primary w-full mt-3"
              disabled={busy}
              onClick={() =>
                setPending({
                  title: "Tallenna kysymykset?",
                  run: () => replaceLiveQuestions(detail.id, questions),
                })
              }
            >
              Tallenna kysymykset
            </button>
          </div>

          {/* Delete */}
          <button
            className="btn btn-accent w-full"
            onClick={() =>
              setPending({
                title: "Poista tapahtuma?",
                message: "Tämä poistaa tapahtuman ja kaikki sen kysymykset.",
                destructive: true,
                run: async () => {
                  await deleteLiveEvent(detail.id);
                  router.push(BACK_HREF);
                },
              })
            }
          >
            <Trash2 size={18} />
            Poista tapahtuma
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        message={pending?.message}
        destructive={pending?.destructive}
        busy={busy}
        onConfirm={confirmRun}
        onCancel={() => setPending(null)}
      />
    </>
  );
}