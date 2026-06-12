"use server";

import { revalidatePath } from "next/cache";
import { requireSpace } from "@/lib/auth/require";
import { uploadImage, deleteImages, signPaths } from "@/lib/storage/images";
import type { Player } from "./types";

export async function listPlayers(): Promise<Player[]> {
  const { supabase, spaceId } = await requireSpace();
  const { data, error } = await supabase
    .from("players")
    .select("id, name, photo_path")
    .eq("space_id", spaceId) // ← scope to THIS olympialaiset
    .order("name");
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const urls = await signPaths(supabase, rows.map((r) => r.photo_path));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    photo_path: r.photo_path,
    photo_url: r.photo_path ? urls.get(r.photo_path) ?? null : null,
  }));
}

// Expects FormData with "name" and optional "photo" (a File).
export async function createPlayer(formData: FormData): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Pelaajan nimi puuttuu.");

  const file = formData.get("photo");
  let photo_path: string | null = null;
  if (file instanceof File && file.size > 0) {
    photo_path = await uploadImage(supabase, spaceId, "players", file);
  }

  const { error } = await supabase
    .from("players")
    .insert({ space_id: spaceId, name, photo_path });
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

export async function updatePlayer(id: string, name: string): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const { error } = await supabase
    .from("players")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("space_id", spaceId); // ← can't edit another space's player
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// Replace a player's photo. Uploads the new file, then removes the old one.
export async function setPlayerPhoto(
  id: string,
  formData: FormData,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Kuva puuttuu.");
  }

  const { data: existing } = await supabase
    .from("players")
    .select("photo_path")
    .eq("id", id)
    .eq("space_id", spaceId) // ← scope guard
    .maybeSingle();

  const newPath = await uploadImage(supabase, spaceId, "players", file);
  const { error } = await supabase
    .from("players")
    .update({ photo_path: newPath })
    .eq("id", id)
    .eq("space_id", spaceId); // ← scope guard
  if (error) throw new Error(error.message);

  if (existing?.photo_path) await deleteImages(supabase, [existing.photo_path]);
  revalidatePath("/o");
}

export async function deletePlayer(id: string): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  // Grab the photo path before deleting — cascade removes rows, not files.
  const { data: existing } = await supabase
    .from("players")
    .select("photo_path")
    .eq("id", id)
    .eq("space_id", spaceId) // ← scope guard
    .maybeSingle();

  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", id)
    .eq("space_id", spaceId); // ← can't delete another space's player
  if (error) throw new Error(error.message);

  if (existing?.photo_path) await deleteImages(supabase, [existing.photo_path]);
  revalidatePath("/o");
}