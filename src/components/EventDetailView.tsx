"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Check, X } from "lucide-react";
import PlayerAvatar from "@/components/PlayerAvatar";
import PhotoCarousel from "@/components/PhotoCarousel";
import PhotoUploader from "@/components/PhotoUploader";
import PointSelect from "@/components/PointSelect";
import PhotoLightbox from "@/components/PhotoLightbox";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  updateevent,
  deleteevent,
  addeventPhoto,
  deleteeventPhoto,
} from "@/lib/db/events";
import { setScore } from "@/lib/db/scores";
import {
  upsertEventStat,
  deleteEventStat,
  type PlayerStat,
} from "@/lib/db/eventStats";
import type { eventDetail } from "@/lib/db/reads";
import type { PointOption } from "@/lib/db/settings";

interface PendingAction {
  title: string;
  message?: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

interface EventDetailViewProps {
  detail: eventDetail;
  pointOptions: PointOption[];
  stats: PlayerStat[];
}

const BACK_HREF = "/o/historia";

export default function EventDetailView({
  detail,
  pointOptions,
  stats,
}: EventDetailViewProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, startTransition] = useTransition();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(detail.name);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photoResetKey, setPhotoResetKey] = useState(0);
  const [pointsEdit, setPointsEdit] = useState<Record<string, string>>(
    Object.fromEntries(
      detail.results.map((r) => [r.player_id, r.points?.toString() ?? ""]),
    ),
  );

  // Lightbox for stat photos (opens the tapped thumbnail full-size).
  const [statLightbox, setStatLightbox] = useState<{
    url: string;
    name: string;
  } | null>(null);

  // Stats editing
  const statByPlayer = new Map(stats.map((s) => [s.player_id, s]));
  const [editStatId, setEditStatId] = useState<string | null>(null);
  const [statNote, setStatNote] = useState("");
  const [statPhoto, setStatPhoto] = useState<File | null>(null);
  const [statResetKey, setStatResetKey] = useState(0);

  function confirmRun() {
    if (!pending) return;
    startTransition(async () => {
      await pending.run();
      setPending(null);
      router.refresh();
    });
  }

  function startEditStat(playerId: string) {
    const s = statByPlayer.get(playerId);
    setEditStatId(playerId);
    setStatNote(s?.note ?? "");
    setStatPhoto(null);
  }

  function saveStat(playerId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("note", statNote);
      if (statPhoto) fd.append("photo", statPhoto);
      await upsertEventStat(detail.id, playerId, fd);
      setEditStatId(null);
      setStatPhoto(null);
      setStatResetKey((k) => k + 1);
      router.refresh();
    });
  }

  return (
    <>
      <Link
        href={BACK_HREF}
        aria-label="Takaisin"
        className="btn btn-soft px-3 mb-4 w-fit"
      >
        <ArrowLeft size={18} />
        Takaisin
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-wine">Laji {detail.ordinal}</p>
          {editingName ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                className="input text-xl font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <button
                aria-label="Tallenna nimi"
                className="btn btn-primary px-3"
                onClick={() =>
                  setPending({
                    title: "Tallenna muutos?",
                    message: `Lajin nimeksi tulee "${name.trim()}".`,
                    run: async () => {
                      await updateevent(detail.id, { name });
                      setEditingName(false);
                    },
                  })
                }
              >
                <Check size={18} />
              </button>
              <button
                aria-label="Peruuta"
                className="btn btn-soft px-3"
                onClick={() => {
                  setName(detail.name);
                  setEditingName(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-ink mt-1 break-words">
              {detail.name}
            </h1>
          )}
        </div>

        {!editingName && (
          <div className="flex gap-2 shrink-0">
            <button
              aria-label="Muokkaa lajia"
              className="btn btn-outline px-3"
              onClick={() => setEditingName(true)}
            >
              <Pencil size={18} />
            </button>
            <button
              aria-label="Poista laji"
              className="btn btn-accent px-3"
              onClick={() =>
                setPending({
                  title: "Poista laji?",
                  message: "Tämä poistaa lajin, sen kuvat ja kaikki pisteet.",
                  destructive: true,
                  run: async () => {
                    await deleteevent(detail.id);
                    router.push(BACK_HREF);
                  },
                })
              }
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Laji photos — carousel with per-photo delete */}
      <div className="mb-5 flex flex-col gap-3">
        <PhotoCarousel
          photos={detail.photos}
          onRequestDelete={(photoId) =>
            setPending({
              title: "Poista kuva?",
              destructive: true,
              run: () => deleteeventPhoto(photoId),
            })
          }
        />
        <PhotoUploader
          multiple
          label="Lisää kuvia"
          onFilesChange={setNewPhotos}
          resetKey={photoResetKey}
        />
        {newPhotos.length > 0 && (
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                for (const file of newPhotos) {
                  const fd = new FormData();
                  fd.append("photo", file);
                  await addeventPhoto(detail.id, fd);
                }
                setNewPhotos([]);
                setPhotoResetKey((k) => k + 1);
                router.refresh();
              })
            }
          >
            {busy ? "Tallennetaan…" : `Tallenna ${newPhotos.length} kuvaa`}
          </button>
        )}
      </div>

      {/* Results — PointSelect so configured options appear */}
      <p className="text-ink font-semibold mb-2">Tulokset</p>
      <div className="flex flex-col gap-2 mb-6">
        {detail.results.map((r) => (
          <div key={r.player_id} className="card flex items-center gap-3 py-3">
            <div className="w-7 text-center font-bold text-wine shrink-0">
              {r.placement ?? "–"}
            </div>
            <Link
              href={`/o/pelaajat/${r.player_id}`}
              className="flex items-center gap-3 flex-1 min-w-0 rounded-lg px-1 -mx-1
                         transition-colors hover:bg-mint-100 active:bg-teal-400"
            >
              <PlayerAvatar
                name={r.name}
                photoUrl={r.photo_url}
                seed={r.player_id}
                size={40}
              />
              <span className="min-w-0 font-semibold text-ink truncate">
                {r.name}
              </span>
            </Link>
            <PointSelect
              options={pointOptions}
              value={pointsEdit[r.player_id] ?? ""}
              onChange={(v) =>
                setPointsEdit((prev) => ({ ...prev, [r.player_id]: v }))
              }
              className="w-20"
            />
            <button
              aria-label="Tallenna pisteet"
              className="btn btn-soft px-3 shrink-0"
              onClick={() =>
                setPending({
                  title: "Muuta pisteitä?",
                  message: `${r.name}: ${parseInt(pointsEdit[r.player_id] ?? "", 10) || 0} pistettä.`,
                  run: () =>
                    setScore(
                      r.player_id,
                      detail.id,
                      parseInt(pointsEdit[r.player_id] ?? "", 10) || 0,
                    ),
                })
              }
            >
              <Check size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Pelikohtaiset stätsit — photos are small thumbnails, tap to open */}
      <p className="text-ink font-semibold mb-2">Pelikohtaiset stätsit</p>
      <div className="flex flex-col gap-2">
        {detail.results.map((r) => {
          const s = statByPlayer.get(r.player_id);
          const editing = editStatId === r.player_id;
          return (
            <div key={r.player_id} className="card flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <PlayerAvatar
                  name={r.name}
                  photoUrl={r.photo_url}
                  seed={r.player_id}
                  size={36}
                />
                <span className="flex-1 min-w-0 font-semibold text-ink truncate">
                  {r.name}
                </span>
                {!editing && (
                  <>
                    <button
                      aria-label="Muokkaa stätsiä"
                      className="btn btn-outline px-3 shrink-0"
                      onClick={() => startEditStat(r.player_id)}
                    >
                      <Pencil size={16} />
                    </button>
                    {s && (
                      <button
                        aria-label="Poista stätsi"
                        className="btn btn-accent px-3 shrink-0"
                        onClick={() =>
                          setPending({
                            title: "Poista stätsi?",
                            destructive: true,
                            run: () => deleteEventStat(detail.id, r.player_id),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>

              {editing ? (
                <>
                  <textarea
                    className="input min-h-16 py-2"
                    placeholder="Teksti (vapaaehtoinen)"
                    value={statNote}
                    onChange={(e) => setStatNote(e.target.value)}
                  />
                  <PhotoUploader
                    label={s?.photo_url ? "Vaihda kuva" : "Lisää kuva"}
                    onFilesChange={(files) => setStatPhoto(files[0] ?? null)}
                    resetKey={statResetKey}
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn btn-soft flex-1"
                      onClick={() => setEditStatId(null)}
                    >
                      Peruuta
                    </button>
                    <button
                      className="btn btn-primary flex-1"
                      disabled={busy}
                      onClick={() => saveStat(r.player_id)}
                    >
                      Tallenna
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* small 80×80 thumbnail; tap opens it full-size */}
                  {s?.photo_url && (
                    <img
                      src={s.photo_url}
                      alt=""
                      loading="lazy"
                      onClick={() =>
                        setStatLightbox({
                          url: s.photo_url!,
                          name: `${r.name}.jpg`,
                        })
                      }
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer"
                    />
                  )}
                  {s?.note ? (
                    <p className="text-ink text-sm break-words">{s.note}</p>
                  ) : (
                    !s?.photo_url && (
                      <p className="text-ink/60 text-sm">Ei stätsiä.</p>
                    )
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        message={pending?.message}
        destructive={pending?.destructive}
        busy={busy}
        onConfirm={confirmRun}
        onCancel={() => setPending(null)}
      />

      {/* Stat-photo lightbox (full-size view + download) */}
      {statLightbox && (
        <PhotoLightbox
          photos={[{ url: statLightbox.url, name: statLightbox.name }]}
          onClose={() => setStatLightbox(null)}
        />
      )}
    </>
  );
}