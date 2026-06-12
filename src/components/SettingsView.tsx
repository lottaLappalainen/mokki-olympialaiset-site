"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import PhotoGallery from "@/components/PhotoGallery";
import PhotoUploader from "@/components/PhotoUploader";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  createPointOption,
  updatePointOption,
  deletePointOption,
  addSpacePhoto,
  deleteSpacePhoto,
  updateSpaceHeader,
  type PointOption,
  type SpacePhoto,
} from "@/lib/db/settings";

interface PendingAction {
  title: string;
  message?: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

interface SettingsViewProps {
  options: PointOption[];
  photos: SpacePhoto[];
  header: string; // current spaces.name
}

// PhotoGallery expects items with id + url; space photos fit that shape.
type GalleryPhoto = {
  id: string;
  storage_path: string;
  sort_order: number;
  url: string | null;
};

export default function SettingsView({
  options,
  photos,
  header: initialHeader,
}: SettingsViewProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, startTransition] = useTransition();

  // Header (olympics title, stored in spaces.name)
  const [header, setHeader] = useState(initialHeader);

  // New-option inputs
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");

  // Which option row is being edited, plus its draft fields
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLabel, setEditLabel] = useState("");

  // New space photos chosen in the uploader (already compressed client-side)
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  // Bumping this clears the uploader's own previews after a save (no doubles).
  const [photoResetKey, setPhotoResetKey] = useState(0);

  function confirmRun() {
    if (!pending) return;
    startTransition(async () => {
      await pending.run();
      setPending(null);
      router.refresh();
    });
  }

  function startEdit(o: PointOption) {
    setEditId(o.id);
    setEditValue(String(o.value));
    setEditLabel(o.label ?? "");
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Olympics header (spaces.name) ────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-ink">Olympialaisten otsikko</h2>
        <input
          className="input text-lg"
          placeholder="esim. Mökkiolympialaiset 2026"
          value={header}
          onChange={(e) => setHeader(e.target.value)}
        />
        <button
          className="btn btn-primary w-fit"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              await updateSpaceHeader(header); // saved to spaces.name
              router.refresh();
            })
          }
        >
          Tallenna otsikko
        </button>
      </section>

      {/* ── Olympics-wide photos ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-ink">Olympialaisten kuvat</h2>

        <PhotoGallery
          photos={photos as GalleryPhoto[]}
          onRequestDelete={(photoId) =>
            setPending({
              title: "Poista kuva?",
              destructive: true,
              run: () => deleteSpacePhoto(photoId),
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
                  await addSpacePhoto(fd);
                }
                setNewPhotos([]);
                setPhotoResetKey((k) => k + 1); // clear previews → no duplicates
                router.refresh();
              })
            }
          >
            {busy ? "Tallennetaan…" : `Tallenna ${newPhotos.length} kuvaa`}
          </button>
        )}
      </section>

      {/* ── Point options ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-ink">Sallitut pisteet</h2>
        <p className="text-ink text-sm">
          Kun lisäät arvoja, pisteet valitaan näistä pudotusvalikosta. Ilman
          arvoja pisteet syötetään vapaasti.
        </p>

        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <div key={o.id} className="card flex items-center gap-2 py-3">
              {editId === o.id ? (
                <>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input w-20 text-center"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <input
                    className="input flex-1 min-w-0"
                    placeholder="Nimi (valinnainen)"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                  />
                  <button
                    aria-label="Tallenna"
                    className="btn btn-primary px-3 shrink-0"
                    onClick={() =>
                      setPending({
                        title: "Tallenna muutos?",
                        run: async () => {
                          await updatePointOption(o.id, {
                            value: parseInt(editValue, 10) || 0,
                            label: editLabel,
                          });
                          setEditId(null);
                        },
                      })
                    }
                  >
                    <Check size={18} />
                  </button>
                  <button
                    aria-label="Peruuta"
                    className="btn btn-soft px-3 shrink-0"
                    onClick={() => setEditId(null)}
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <>
                  <span className="font-bold text-ink w-12 text-center shrink-0">
                    {o.value}
                  </span>
                  <span className="flex-1 min-w-0 text-ink truncate">
                    {o.label ?? ""}
                  </span>
                  <button
                    aria-label="Muokkaa"
                    className="btn btn-outline px-3 shrink-0"
                    onClick={() => startEdit(o)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    aria-label="Poista"
                    className="btn btn-accent px-3 shrink-0"
                    onClick={() =>
                      setPending({
                        title: "Poista pistearvo?",
                        message: `Arvo ${o.value} poistetaan valikosta.`,
                        destructive: true,
                        run: () => deletePointOption(o.id),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
          {options.length === 0 && (
            <p className="text-ink text-sm">Ei vielä pistearvoja.</p>
          )}
        </div>

        {/* Add new option */}
        <div className="card flex items-center gap-2 py-3">
          <input
            type="number"
            inputMode="numeric"
            className="input w-20 text-center"
            placeholder="Pisteet"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <input
            className="input flex-1 min-w-0"
            placeholder="Nimi (valinnainen)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button
            aria-label="Lisää pistearvo"
            className="btn btn-primary px-3 shrink-0"
            disabled={busy || newValue.trim() === ""}
            onClick={() =>
              startTransition(async () => {
                await createPointOption(parseInt(newValue, 10) || 0, newLabel);
                setNewValue("");
                setNewLabel("");
                router.refresh();
              })
            }
          >
            <Plus size={18} />
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        message={pending?.message}
        destructive={pending?.destructive}
        busy={busy}
        onConfirm={confirmRun}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
