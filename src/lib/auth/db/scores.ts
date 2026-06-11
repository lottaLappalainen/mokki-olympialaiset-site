"use server";

import { revalidatePath } from "next/cache";
import { requireSpace } from "@/lib/auth/require";

// Set (or update) a single player's points in a laji.
export async function setScore(
  playerId: string,
  lajiId: string,
  points: number,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const value = Number.isFinite(points) ? Math.trunc(points) : 0;

  const { error } = await supabase.from("scores").upsert(
    { space_id: spaceId, player_id: playerId, laji_id: lajiId, points: value },
    { onConflict: "player_id,laji_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// Set every player's points for one laji in a single round-trip.
// Used by the loki scoring step ("update everyone's score").
export async function setScores(
  lajiId: string,
  entries: { playerId: string; points: number }[],
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  if (entries.length === 0) return;

  const rows = entries.map((e) => ({
    space_id: spaceId,
    player_id: e.playerId,
    laji_id: lajiId,
    points: Number.isFinite(e.points) ? Math.trunc(e.points) : 0,
  }));

  const { error } = await supabase
    .from("scores")
    .upsert(rows, { onConflict: "player_id,laji_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

export async function deleteScore(
  playerId: string,
  lajiId: string,
): Promise<void> {
  const { supabase } = await requireSpace();
  const { error } = await supabase
    .from("scores")
    .delete()
    .eq("player_id", playerId)
    .eq("laji_id", lajiId);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}