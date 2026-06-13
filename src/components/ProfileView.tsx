"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PlayerAvatar from "@/components/PlayerAvatar";
import PlayerForm from "@/components/PlayerForm";
import { createPlayer } from "@/lib/db/players";
import { leaveSpace } from "@/lib/auth/actions";
import type { Player } from "@/lib/db/types";

interface ProfileViewProps {
  players: Player[];
}

export default function ProfileView({ players }: ProfileViewProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="Pelaajat"
        right={
          <button
            className="btn btn-primary px-3 py-1.5 text-sm"
            onClick={() => setAdding(true)}
          >
            <Plus size={16} />
            Lisää
          </button>
        }
      />

      {players.length === 0 ? (
        <p className="text-ink mb-6">Ei vielä pelaajia.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {players.map((p) => (
            <Link
              key={p.id}
              href={`/o/pelaajat/${p.id}`}
              className="flex flex-col items-center gap-2"
            >
              <PlayerAvatar
                name={p.name}
                photoUrl={p.photo_url}
                seed={p.id}
                size={72}
              />
              <span className="text-sm font-medium text-ink text-center truncate w-full">
                {p.name}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Logout stays here on Pelaajat */}
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
          <div
            className="card w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
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