"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, Trash2, ClipboardList } from "lucide-react";
import LiveQuestionEditor from "@/components/LiveQuestionEditor";
import ConfirmDialog from "@/components/ConfirmDialog";
import PlayerAvatar from "@/components/PlayerAvatar";
import PhotoLightbox from "@/components/PhotoLightbox";
import LiveAnswerForm from "@/components/LiveAnswerForm";
import LiveVoting from "@/components/LiveVoting";
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
  reveal: RevealQuestion[] | null;
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

  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  // lightbox for the no-voting reveal grid (multi-photo answers)
  const [lightbox, setLightbox] = useState<{ urls: string[]; at: number } | null>(
    null,
  );

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

  const votingActive = detail.has_voting && detail.revealed;

  function confirmRun() {
    if (!pending) return;
    startTransition(async () => {
      await pending.run();
      setPending(null);
      router.refresh();
    });
  }

  // Run a reveal action AND close settings, so the result is immediately
  // visible in the main area instead of hidden behind the settings panel.
  function revealAction(action: PendingAction) {
    setShowSettings(false);
    setPending(action);
  }

  // ── Active player is answering (pre-reveal) or voting (reveal + voting) ────
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
    return (
      <LiveVoting
        liveEventId={detail.id}
        voterId={activePlayer.id}
        questions={reveal ?? []}
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
          {/* RESULTS — voting events, only after results_revealed */}
          {detail.has_voting &&
            detail.results_revealed &&
            voteResults.length > 0 && (
              <div className="mb-6">
                <VoteResults results={voteResults} />
              </div>
            )}

          {/* REVEAL (no voting): each answer = avatar on top, answer below.
              2 per row. Photo answers show ALL their photos. */}
          {detail.revealed && !detail.has_voting && reveal && (
            <div className="flex flex-col gap-6 mb-6">
              {reveal.map((q) => (
                <div key={q.id}>
                  <p className="font-semibold text-ink mb-2">{q.prompt}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.answers.map((a) => {
                      const photos = a.photo_urls ?? [];
                      return (
                        <div
                          key={a.answer_id}
                          className="card flex flex-col items-center gap-2 text-center"
                        >
                          <PlayerAvatar
                            name={a.player_name}
                            photoUrl={a.player_photo_url}
                            seed={a.player_id}
                            size={56}
                          />
                          {photos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1 w-full">
                              {photos.map((url, pi) => (
                                <img
                                  key={pi}
                                  src={url}
                                  alt=""
                                  loading="lazy"
                                  onClick={() =>
                                    setLightbox({ urls: photos, at: pi })
                                  }
                                  className="w-full aspect-square object-cover rounded-lg cursor-pointer"
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-ink text-sm break-words">
                              {a.text}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PLAYER TILES — answering, or voting. Hidden once answers are revealed
              in a no-voting event, or once results are out in a voting event. */}
          {!(detail.has_voting && detail.results_revealed) &&
            !(!detail.has_voting && detail.revealed) && (
            <>
              <p className="text-ink mb-3">
                {votingActive
                  ? "Napauta kuvaasi äänestääksesi."
                  : "Napauta kuvaasi vastataksesi."}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {players.map((p) => {
                  const done = votingActive
                    ? voted.has(p.id)
                    : answered.has(p.id);
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
                              ? "ring-teal-600"
                              : "ring-wine"
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

          {/* Reveal controls — depend on has_voting. Each closes settings. */}
          {!detail.has_voting ? (
            // No voting: one "Näytä vastaukset"
            <div className="card flex flex-col gap-2">
              <button
                className="btn btn-primary w-full disabled:opacity-40"
                disabled={!everyoneAnswered || detail.revealed}
                onClick={() =>
                  revealAction({
                    title: "Näytä vastaukset?",
                    run: () => setLiveEventRevealed(detail.id, true),
                  })
                }
              >
                {detail.revealed ? "Vastaukset näkyvissä" : "Näytä vastaukset"}
              </button>
              {!everyoneAnswered && !detail.revealed && (
                <p className="text-xs text-ink/70">
                  Kaikkien on ensin vastattava.
                </p>
              )}
            </div>
          ) : (
            // Voting: start voting + reveal results
            <div className="card flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <button
                  className="btn btn-primary w-full disabled:opacity-40"
                  disabled={!everyoneAnswered || detail.revealed}
                  onClick={() =>
                    revealAction({
                      title: "Aloita äänestys?",
                      run: () => setLiveEventRevealed(detail.id, true),
                    })
                  }
                >
                  {detail.revealed ? "Äänestys käynnissä" : "Aloita äänestys"}
                </button>
                {!everyoneAnswered && !detail.revealed && (
                  <p className="text-xs text-ink/70">
                    Kaikkien on ensin vastattava.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <button
                  className="btn btn-primary w-full disabled:opacity-40"
                  disabled={!everyoneVoted || detail.results_revealed}
                  onClick={() =>
                    revealAction({
                      title: "Paljasta tulokset?",
                      run: () =>
                        setLiveEventResultsRevealed(detail.id, true),
                    })
                  }
                >
                  {detail.results_revealed
                    ? "Tulokset paljastettu"
                    : "Paljasta tulokset"}
                </button>
                {!everyoneVoted && !detail.results_revealed && (
                  <p className="text-xs text-ink/70">
                    Kaikkien on ensin äänestettävä.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Kirjaa laji — prefills the scored-laji form */}
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

      {/* Multi-photo lightbox for the no-voting reveal grid */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.urls.map((url, i) => ({
            url,
            name: `kuva-${i + 1}.jpg`,
          }))}
          startIndex={lightbox.at}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}