"use client";

import { useState, useTransition } from "react";
import { createSpace, joinSpace } from "@/lib/auth/actions";

type View = "choose" | "created" | "enter";

export default function LandingPage() {
  const [view, setView] = useState<View>("choose");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        const { code: newCode } = await createSpace();
        setCode(newCode);
        setView("created");
      } catch {
        setError("Olympialaisten luonti epäonnistui. Yritä uudelleen.");
      }
    });
  }

  function handleJoin() {
    setError(null);
    startTransition(async () => {
      // On success joinSpace redirects to /o; only failures return here.
      const result = await joinSpace(code);
      if (result?.error) setError(result.error);
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — the code is on screen to copy by hand.
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-ink mb-1">
          Olympialaiset
        </h1>
        <p className="text-center text-teal-600 mb-8">
          Luo tai liity koodilla
        </p>

        {view === "choose" && (
          <div className="flex flex-col gap-3">
            <button
              className="btn btn-primary"
              onClick={() => {
                setError(null);
                setCode("");
                setView("enter");
              }}
            >
              Syötä koodi
            </button>
            <button
              className="btn btn-accent"
              onClick={handleCreate}
              disabled={isPending}
            >
              {isPending ? "Luodaan…" : "Luo olympialaiset"}
            </button>
          </div>
        )}

        {view === "created" && (
          <div className="flex flex-col gap-5">
            <div className="card-accent text-center">
              <p className="text-sm font-semibold text-wine mb-3">Jaa koodi</p>
              <button
                onClick={handleCopy}
                aria-label="Kopioi koodi"
                className="block w-full font-mono font-bold tracking-[0.15em] text-ink text-5xl leading-none break-all"
              >
                {code}
              </button>
              <p className="text-sm text-teal-600 mt-3 min-h-5">
                {copied ? "Kopioitu!" : "Napauta kopioidaksesi"}
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={isPending}
            >
              {isPending ? "Avataan…" : "Jatka olympialaisiin"}
            </button>
          </div>
        )}

        {view === "enter" && (
          <div className="flex flex-col gap-3">
            <input
              className="input text-center text-xl tracking-[0.15em] uppercase"
              placeholder="Koodi"
              value={code}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
            <button
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={isPending}
            >
              {isPending ? "Avataan…" : "Jatka"}
            </button>
            <button
              className="btn btn-soft"
              onClick={() => {
                setError(null);
                setView("choose");
              }}
            >
              Takaisin
            </button>
          </div>
        )}

        {error && (
          <p className="text-center text-wine font-medium mt-4">{error}</p>
        )}
      </div>
    </main>
  );
}