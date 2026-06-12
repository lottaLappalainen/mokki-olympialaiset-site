"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Check, X } from "lucide-react";
import PlayerAvatar from "@/components/PlayerAvatar";
import PhotoCarousel from "@/components/PhotoCarousel"; // was PhotoGallery
import PhotoUploader from "@/components/PhotoUploader";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  updateevent,
  deleteevent,
  addeventPhoto,
  deleteeventPhoto,
} from "@/lib/db/events";
import { setScore } from "@/lib/db/scores";
import type { eventDetail } from "@/lib/db/reads";

interface PendingAction {
  title: string;
  message?: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

const BACK_HREF = "/o/historia";

export default function EventDetailView({ detail }: { detail: eventDetail }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, startTransition] = useTransition();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(detail.name);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  // clears the uploader previews after save (no duplicates)
  const [photoResetKey, setPhotoResetKey] = useState(0);
  const [pointsEdit, setPointsEdit] = useState<Record<string, string>>(
    Object.fromEntries(
      detail.results.map((r) => [r.player_id, r.points?.toString() ?? ""]),
    ),
  );

  function confirmRun() {
    if (!pending) return;
    startTransition(async () => {
      await pending.run();
      setPending(null);
      router.refresh();
    });
  }

  return (
    <>
      <Link
        href={BACK_HREF}
        aria-label="Takaisin historiaan"
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

      {/* Photos — now a swipeable carousel WITH per-photo delete */}
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

      {/* Results, best to worst */}
      <p className="text-ink font-semibold mb-2">Tulokset</p>
      <div className="flex flex-col gap-2">
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

            <input
              type="number"
              inputMode="numeric"
              className="input w-16 text-center"
              placeholder="–"
              value={pointsEdit[r.player_id] ?? ""}
              onChange={(e) =>
                setPointsEdit((prev) => ({
                  ...prev,
                  [r.player_id]: e.target.value,
                }))
              }
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
