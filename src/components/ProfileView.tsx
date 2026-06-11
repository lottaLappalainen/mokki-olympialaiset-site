"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Copy, Check } from "lucide-react";
import PlayerAvatar from "@/components/PlayerAvatar";
import PlayerForm from "@/components/PlayerForm";
import { createPlayer } from "@/lib/db/players";
import { leaveSpace } from "@/lib/auth/actions";
import type { Player } from "@/lib/db/types";

interface ProfileViewProps {
  code: string;
  players: Player[];
}

export default function ProfileView({ code, players }: ProfileViewProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

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
    <>
      {/* Code */}
      <div className="card-accent text-center mb-6">
        <p className="text-sm font-semibold text-wine mb-2">Olympialaisten koodi</p>
        <button
          onClick={copyCode}
          className="block w-full font-mono font-bold tracking-[0.15em] text-ink text-4xl break-all"
        >
          {code}
        </button>
        <p className="text-sm text-teal-600 mt-3 flex items-center justify-center gap-1.5">
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Kopioitu!" : "Napauta kopioidaksesi"}
        </p>
      </div>

      {/* Players */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-ink">Pelaajat</h2>
        <button
          className="btn btn-primary px-3 py-1.5 text-sm"
          onClick={() => setAdding(true)}
        >
          <Plus size={16} />
          Lisää
        </button>
      </div>

      {players.length === 0 ? (
        <p className="text-teal-600 mb-6">Ei vielä pelaajia.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {players.map((p) => (
            <Link
              key={p.id}
              href={`/o/pelaajat/${p.id}`}
              className="flex flex-col items-center gap-2"
            >
              <PlayerAvatar name={p.name} photoUrl={p.photo_url} size={72} />
              <span className="text-sm font-medium text-ink text-center truncate w-full">
                {p.name}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Logout */}
      <form action={leaveSpace} className="mt-4">
        <button type="submit" className="btn btn-outline w-full">
          <LogOut size={18} />
          Kirjaudu ulos
        </button>
      </form>

      {/* Add player modal */}
      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(16, 33, 30, 0.45)" }}
          onClick={() => setAdding(false)}
        >
          <div className="card w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-ink mb-4">Lisää pelaaja</h2>
            <PlayerForm
              submitLabel="Lisää pelaaja"
              onSubmit={async (fd) => {
                await createPlayer(fd);
                setAdding(false);
                router.refresh();
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}