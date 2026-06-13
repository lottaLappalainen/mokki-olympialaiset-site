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
  created_at: string | null; // upload timestamp (ISO)
}

// ── Point options ────────────────────────────────────────────────────────────

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

export async function getSpaceHeader(): Promise<string> {
  const { supabase, spaceId } = await requireSpace();
  const { data } = await supabase
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .maybeSingle();
  return data?.name ?? "";
}

export async function updateSpaceHeader(name: string): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const { error } = await supabase
    .from("spaces")
    .update({ name: name.trim() ? name.trim() : null })
    .eq("id", spaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

export async function createPointOption(
  value: number,
  label?: string,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();

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
  revalidatePath("/o");
}

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
    .eq("space_id", spaceId);
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
    .select("id, storage_path, sort_order, created_at")
    .eq("space_id", spaceId)
    .order("sort_order");

  const rows = data ?? [];
  const urls = await signPaths(supabase, rows.map((p) => p.storage_path));
  return rows.map((p) => ({
    id: p.id,
    storage_path: p.storage_path,
    sort_order: p.sort_order,
    url: urls.get(p.storage_path) ?? null,
    created_at: p.created_at ?? null,
  }));
}

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