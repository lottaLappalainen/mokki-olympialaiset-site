"use server";

import { revalidatePath } from "next/cache";
import { requireSpace } from "@/lib/auth/require";
import { uploadImage, deleteImages, signPaths } from "@/lib/storage/images";
import type { event, eventPhoto } from "./types";

export async function listeventt(): Promise<event[]> {
  const { supabase } = await requireSpace();

  const { data: eventt, error } = await supabase
    .from("eventt")
    .select("id, ordinal, name")
    .order("ordinal")
    .order("name");
  if (error) throw new Error(error.message);

  const list = eventt ?? [];
  const ids = list.map((l) => l.id);

  const byevent = new Map<string, eventPhoto[]>();
  if (ids.length) {
    const { data: photos } = await supabase
      .from("event_photos")
      .select("id, event_id, storage_path, sort_order")
      .in("event_id", ids)
      .order("sort_order");

    const all = photos ?? [];
    const urls = await signPaths(supabase, all.map((p) => p.storage_path));
    for (const ph of all) {
      const arr = byevent.get(ph.event_id) ?? [];
      arr.push({
        id: ph.id,
        storage_path: ph.storage_path,
        sort_order: ph.sort_order,
        url: urls.get(ph.storage_path) ?? null,
      });
      byevent.set(ph.event_id, arr);
    }
  }

  return list.map((l) => ({
    id: l.id,
    ordinal: l.ordinal,
    name: l.name,
    photos: byevent.get(l.id) ?? [],
  }));
}

// Returns the new event's id + ordinal so the caller can keep working with it
// (upload photos, then enter scores).
export async function createevent(
  name: string,
): Promise<{ id: string; ordinal: number }> {
  const { supabase, spaceId } = await requireSpace();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("eventn nimi puuttuu.");

  const { data: max } = await supabase
    .from("eventt")
    .select("ordinal")
    .order("ordinal", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordinal = (max?.ordinal ?? 0) + 1;

  const { data, error } = await supabase
    .from("eventt")
    .insert({ space_id: spaceId, name: trimmed, ordinal })
    .select("id, ordinal")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/o");
  return { id: data.id, ordinal: data.ordinal };
}

export async function updateevent(
  id: string,
  fields: { name?: string; ordinal?: number },
): Promise<void> {
  const { supabase } = await requireSpace();
  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.ordinal !== undefined) patch.ordinal = fields.ordinal;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("eventt").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// Pass the event ids in the order you want; ordinal becomes index + 1.
export async function reordereventt(orderedIds: string[]): Promise<void> {
  const { supabase } = await requireSpace();
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("eventt").update({ ordinal: i + 1 }).eq("id", id),
    ),
  );
  revalidatePath("/o");
}

export async function deleteevent(id: string): Promise<void> {
  const { supabase } = await requireSpace();
  const { data: photos } = await supabase
    .from("event_photos")
    .select("storage_path")
    .eq("event_id", id);

  const { error } = await supabase.from("eventt").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await deleteImages(supabase, (photos ?? []).map((p) => p.storage_path));
  revalidatePath("/o");
}

export async function addeventPhoto(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Kuva puuttuu.");
  }

  const path = await uploadImage(supabase, spaceId, "eventt", file);

  const { data: max } = await supabase
    .from("event_photos")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (max?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("event_photos").insert({
    space_id: spaceId,
    event_id: eventId,
    storage_path: path,
    sort_order,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

export async function deleteeventPhoto(photoId: string): Promise<void> {
  const { supabase } = await requireSpace();
  const { data: photo } = await supabase
    .from("event_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();

  const { error } = await supabase
    .from("event_photos")
    .delete()
    .eq("id", photoId);
  if (error) throw new Error(error.message);

  if (photo?.storage_path) await deleteImages(supabase, [photo.storage_path]);
  revalidatePath("/o");
}