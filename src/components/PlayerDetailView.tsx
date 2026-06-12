"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import PlayerAvatar from "@/components/PlayerAvatar";
import PlayerForm from "@/components/PlayerForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhotoLightbox from "@/components/PhotoLightbox";
import { updatePlayer, setPlayerPhoto, deletePlayer } from "@/lib/db/players";
import type { PlayerDetail } from "@/lib/db/reads";

interface PendingAction {
  title: string;
  message?: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

const BACK_HREF = "/o/pelaajat";

export default function PlayerDetailView({ detail }: { detail: PlayerDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, startTransition] = useTransition();
  const [showPhoto, setShowPhoto] = useState(false); // big-avatar lightbox

  function confirmRun() {
    if (!pending) return;
    startTransition(async () => {
      await pending.run();
      setPending(null);
      router.refresh();
    });
  }

  async function applyEdit(fd: FormData) {
    const newName = String(fd.get("name") ?? "").trim();
    if (newName && newName !== detail.name) {
      await updatePlayer(detail.id, newName);
    }
    if (fd.get("photo") instanceof File) {
      await setPlayerPhoto(detail.id, fd);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <>
        <h1 className="text-2xl font-bold text-ink mb-5">Muokkaa pelaajaa</h1>
        <PlayerForm
          initialName={detail.name}
          initialPhotoUrl={detail.photo_url}
          submitLabel="Tallenna muutokset"
          onSubmit={applyEdit}
          onCancel={() => setEditing(false)}
          confirmFirst={(fd) =>
            setPending({
              title: "Tallenna muutokset?",
              run: () => applyEdit(fd),
            })
          }
        />
        <ConfirmDialog
          open={pending !== null}
          title={pending?.title ?? ""}
          busy={busy}
          onConfirm={confirmRun}
          onCancel={() => setPending(null)}
        />
      </>
    );
  }

  return (
    <>
      {/* Top-left back button → players list */}
      <Link
        href={BACK_HREF}
        aria-label="Takaisin pelaajiin"
        className="btn btn-soft px-3 mb-4 w-fit"
      >
        <ArrowLeft size={18} />
        Takaisin
      </Link>

      <div className="flex flex-col items-center gap-3 mb-6">
        {/* Big avatar → opens the photo in a lightbox (with download).
            Only clickable when there's actually a photo. */}
        <button
          onClick={() => detail.photo_url && setShowPhoto(true)}
          disabled={!detail.photo_url}
          aria-label="Näytä kuva"
          className="rounded-full"
        >
          <PlayerAvatar
            name={detail.name}
            photoUrl={detail.photo_url}
            seed={detail.id}
            size={112}
          />
        </button>

        <h1 className="text-2xl font-bold text-ink text-center">{detail.name}</h1>
        {/* on-background text → ink (black), per the design rule */}
        <p className="text-ink font-semibold">
          Yhteensä {detail.total} pistettä
        </p>
        <div className="flex gap-2">
          <button className="btn btn-outline px-4" onClick={() => setEditing(true)}>
            <Pencil size={18} />
            Muokkaa
          </button>
          <button
            className="btn btn-accent px-4"
            onClick={() =>
              setPending({
                title: "Poista pelaaja?",
                message: "Tämä poistaa pelaajan ja kaikki hänen pisteensä.",
                destructive: true,
                run: async () => {
                  await deletePlayer(detail.id);
                  router.push(BACK_HREF);
                },
              })
            }
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <h2 className="font-bold text-ink mb-2">Pisteet lajeittain</h2>
      {detail.scores.length === 0 ? (
        <p className="text-ink">Ei vielä pisteitä.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {detail.scores.map((s) => (
            // Each event row links to that event's detail page.
            <Link
              key={s.event_id}
              href={`/o/historia/${s.event_id}`}
              className="card card-link flex items-center gap-3 py-3"
            >
              <div className="text-xs font-semibold text-wine shrink-0">
                Laji {s.ordinal}
              </div>
              <span className="flex-1 min-w-0 font-semibold text-ink truncate">
                {s.name}
              </span>
              <span className="text-lg font-bold text-wine shrink-0">
                {s.points}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Fullscreen photo viewer (arrows N/A for one image, download built in) */}
      {showPhoto && detail.photo_url && (
        <PhotoLightbox
          photos={[{ url: detail.photo_url, name: `${detail.name}.jpg` }]}
          onClose={() => setShowPhoto(false)}
        />
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