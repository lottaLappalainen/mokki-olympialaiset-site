"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  createPointOption,
  updatePointOption,
  deletePointOption,
  updateSpaceHeader,
  type PointOption,
} from "@/lib/db/settings";

interface PendingAction {
  title: string;
  message?: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

interface SettingsViewProps {
  code: string;
  options: PointOption[];
  header: string;
}

export default function SettingsView({
  code,
  options,
  header: initialHeader,
}: SettingsViewProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, startTransition] = useTransition();

  const [header, setHeader] = useState(initialHeader);
  const [copied, setCopied] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [pointsOpen, setPointsOpen] = useState(false);

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

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* code is visible to copy by hand */
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Game code (gradient banner) ──────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 text-center text-paper
                   bg-gradient-to-r from-wine via-plum to-teal-600
                   bg-[length:200%_200%] animate-[gradientShift_6s_ease-in-out_infinite]"
      >
        <p className="text-sm font-semibold mb-2 opacity-90">
          Olympialaisten koodi
        </p>
        <button
          onClick={copyCode}
          className="block w-full font-mono font-bold tracking-[0.15em] text-4xl break-all"
        >
          {code}
        </button>
        <p className="text-sm mt-3 opacity-90">
          {copied ? "Kopioitu!" : "Napauta kopioidaksesi"}
        </p>
      </div>

      {/* ── Olympics header ───────────────────────────────────────────────── */}
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
              await updateSpaceHeader(header);
              router.refresh();
            })
          }
        >
          Tallenna otsikko
        </button>
      </section>

      {/* ── Point options ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setPointsOpen((o) => !o)}
        >
          <h2 className="font-bold text-ink">Sallitut pisteet</h2>
          {pointsOpen ? (
            <ChevronUp size={20} className="text-ink shrink-0" />
          ) : (
            <ChevronDown size={20} className="text-ink shrink-0" />
          )}
        </button>

        {pointsOpen && (
          <>
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
          </>
        )}
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