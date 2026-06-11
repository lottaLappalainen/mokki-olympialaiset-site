"use server";

import { revalidatePath } from "next/cache";
import { requireSpace } from "@/lib/auth/require";

// Set (or update) a single player's points in a event.
export async function setScore(
  playerId: string,
  eventId: string,
  points: number,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const value = Number.isFinite(points) ? Math.trunc(points) : 0;

  const { error } = await supabase.from("scores").upsert(
    { space_id: spaceId, player_id: playerId, event_id: eventId, points: value },
    { onConflict: "player_id,event_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// Set every player's points for one event in a single round-trip.
// Used by the loki scoring step ("update everyone's score").
export async function setScores(
  eventId: string,
  entries: { playerId: string; points: number }[],
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  if (entries.length === 0) return;

  const rows = entries.map((e) => ({
    space_id: spaceId,
    player_id: e.playerId,
    event_id: eventId,
    points: Number.isFinite(e.points) ? Math.trunc(e.points) : 0,
  }));

  const { error } = await supabase
    .from("scores")
    .upsert(rows, { onConflict: "player_id,event_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

export async function deleteScore(
  playerId: string,
  eventId: string,
): Promise<void> {
  const { supabase } = await requireSpace();
  const { error } = await supabase
    .from("scores")
    .delete()
    .eq("player_id", playerId)
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}