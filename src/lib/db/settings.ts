"use server";

import { revalidatePath } from "next/cache";
import { requireSpace } from "@/lib/auth/require";
import { uploadImage, deleteImages, signPaths } from "@/lib/storage/images";

// ── Types ────────────────────────────────────────────────────────────────────
export interface PointOption {
  id: string;
  value: number;
  label: string | null;
  sort_order: number;
}

export interface SpacePhoto {
  id: string;
  storage_path: string;
  sort_order: number;
  url: string | null;
}

// ── Point options ────────────────────────────────────────────────────────────

// List this space's point options, ordered for the dropdown.
export async function listPointOptions(): Promise<PointOption[]> {
  const { supabase, spaceId } = await requireSpace();
  const { data, error } = await supabase
    .from("point_options")
    .select("id, value, label, sort_order")
    .eq("space_id", spaceId)
    .order("sort_order")
    .order("value", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Olympics header (stored in spaces.name) ───────────────────────────────────

// Read the current header text for this space.
export async function getSpaceHeader(): Promise<string> {
  const { supabase, spaceId } = await requireSpace();
  const { data } = await supabase
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .maybeSingle();
  return data?.name ?? "";
}

// Save the header text. Empty string clears it (stored as null).
export async function updateSpaceHeader(name: string): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const { error } = await supabase
    .from("spaces")
    .update({ name: name.trim() ? name.trim() : null })
    .eq("id", spaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/o"); // main page + settings re-read it
}

// Add a new option. label is optional ("" → stored as null).
export async function createPointOption(
  value: number,
  label?: string,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();

  // Next sort_order = current max within this space + 1.
  const { data: max } = await supabase
    .from("point_options")
    .select("sort_order")
    .eq("space_id", spaceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (max?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("point_options").insert({
    space_id: spaceId,
    value: Math.trunc(value),
    label: label?.trim() ? label.trim() : null,
    sort_order,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/o"); // refresh anything reading the options
}

// Edit an existing option (value and/or label).
export async function updatePointOption(
  id: string,
  fields: { value?: number; label?: string },
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const patch: Record<string, unknown> = {};
  if (fields.value !== undefined) patch.value = Math.trunc(fields.value);
  if (fields.label !== undefined) {
    patch.label = fields.label.trim() ? fields.label.trim() : null;
  }
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("point_options")
    .update(patch)
    .eq("id", id)
    .eq("space_id", spaceId); // scope guard
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

export async function deletePointOption(id: string): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const { error } = await supabase
    .from("point_options")
    .delete()
    .eq("id", id)
    .eq("space_id", spaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// ── Space photos ─────────────────────────────────────────────────────────────

export async function listSpacePhotos(): Promise<SpacePhoto[]> {
  const { supabase, spaceId } = await requireSpace();
  const { data } = await supabase
    .from("space_photos")
    .select("id, storage_path, sort_order")
    .eq("space_id", spaceId)
    .order("sort_order");

  const rows = data ?? [];
  const urls = await signPaths(supabase, rows.map((p) => p.storage_path));
  return rows.map((p) => ({
    id: p.id,
    storage_path: p.storage_path,
    sort_order: p.sort_order,
    url: urls.get(p.storage_path) ?? null,
  }));
}

// Expects FormData with a "photo" File. Stored under {spaceId}/space/...
export async function addSpacePhoto(formData: FormData): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Kuva puuttuu.");
  }

  const path = await uploadImage(supabase, spaceId, "space", file);

  const { data: max } = await supabase
    .from("space_photos")
    .select("sort_order")
    .eq("space_id", spaceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (max?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("space_photos").insert({
    space_id: spaceId,
    storage_path: path,
    sort_order,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

export async function deleteSpacePhoto(photoId: string): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const { data: photo } = await supabase
    .from("space_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("space_id", spaceId)
    .maybeSingle();

  const { error } = await supabase
    .from("space_photos")
    .delete()
    .eq("id", photoId)
    .eq("space_id", spaceId);
  if (error) throw new Error(error.message);

  if (photo?.storage_path) await deleteImages(supabase, [photo.storage_path]);
  revalidatePath("/o");
}