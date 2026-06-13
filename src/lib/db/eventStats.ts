"use server";

import { revalidatePath } from "next/cache";
import { requireSpace } from "@/lib/auth/require";
import { uploadImage, deleteImages, signPaths } from "@/lib/storage/images";

export interface PlayerStat {
  player_id: string;
  note: string | null;
  photo_path: string | null;
  photo_url: string | null;
}

// One stat draft as collected in the logging flow, before the event exists.
export interface StatDraft {
  playerId: string;
  note: string;        // "" = no note
  photo: File | null;  // null = no photo
}

// Save all per-player stats for a freshly-created event. Skips players with
// neither a note nor a photo. Called at final "Tallenna laji".
export async function saveEventStats(
  eventId: string,
  stats: StatDraft[],
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();

  const rows: any[] = [];
  for (const s of stats) {
    const hasNote = s.note.trim().length > 0;
    const hasPhoto = s.photo instanceof File && s.photo.size > 0;
    if (!hasNote && !hasPhoto) continue; // nothing for this player

    let photo_path: string | null = null;
    if (hasPhoto) {
      photo_path = await uploadImage(supabase, spaceId, "events", s.photo!);
    }
    rows.push({
      space_id: spaceId,
      event_id: eventId,
      player_id: s.playerId,
      note: hasNote ? s.note.trim() : null,
      photo_path,
    });
  }
  if (!rows.length) return;

  const { error } = await supabase.from("event_player_stats").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// Read an event's stats (with signed photo URLs) for the detail view.
export async function listEventStats(eventId: string): Promise<PlayerStat[]> {
  const { supabase, spaceId } = await requireSpace();
  const { data } = await supabase
    .from("event_player_stats")
    .select("player_id, note, photo_path")
    .eq("event_id", eventId)
    .eq("space_id", spaceId);

  const rows = data ?? [];
  const urls = await signPaths(supabase, rows.map((r) => r.photo_path));
  return rows.map((r) => ({
    player_id: r.player_id,
    note: r.note,
    photo_path: r.photo_path,
    photo_url: r.photo_path ? urls.get(r.photo_path) ?? null : null,
  }));
}

// Edit one player's stat later (detail view). Upserts on (event, player).
// Pass note (string) and/or a new photo via FormData. Empty note clears it.
export async function upsertEventStat(
  eventId: string,
  playerId: string,
  formData: FormData,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const note = String(formData.get("note") ?? "").trim();
  const file = formData.get("photo");

  // existing row (for old photo cleanup)
  const { data: existing } = await supabase
    .from("event_player_stats")
    .select("id, photo_path")
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .eq("space_id", spaceId)
    .maybeSingle();

  let photo_path = existing?.photo_path ?? null;
  let oldToDelete: string | null = null;
  if (file instanceof File && file.size > 0) {
    photo_path = await uploadImage(supabase, spaceId, "events", file);
    if (existing?.photo_path) oldToDelete = existing.photo_path;
  }

  const { error } = await supabase
    .from("event_player_stats")
    .upsert(
      {
        space_id: spaceId,
        event_id: eventId,
        player_id: playerId,
        note: note || null,
        photo_path,
      },
      { onConflict: "event_id,player_id" },
    );
  if (error) throw new Error(error.message);

  if (oldToDelete) await deleteImages(supabase, [oldToDelete]);
  revalidatePath("/o");
}

// Delete one player's stat (and its photo).
export async function deleteEventStat(
  eventId: string,
  playerId: string,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const { data: existing } = await supabase
    .from("event_player_stats")
    .select("photo_path")
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .eq("space_id", spaceId)
    .maybeSingle();

  const { error } = await supabase
    .from("event_player_stats")
    .delete()
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .eq("space_id", spaceId);
  if (error) throw new Error(error.message);

  if (existing?.photo_path) await deleteImages(supabase, [existing.photo_path]);
  revalidatePath("/o");
}