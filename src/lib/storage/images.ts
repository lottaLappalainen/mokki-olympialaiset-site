import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "olympialaiset";

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "bin";
}

// Upload a file under "{spaceId}/{folder}/{uuid}.{ext}" and return its path.
export async function uploadImage(
  supabase: SupabaseClient,
  spaceId: string,
  folder: "players" | "events" | "space" | "live",
  file: File,
): Promise<string> {
  const path = `${spaceId}/${folder}/${randomUUID()}.${extOf(file.name)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

// Remove one or more files. Safe to call with an empty array.
export async function deleteImages(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  const clean = paths.filter(Boolean);
  if (clean.length === 0) return;
  await supabase.storage.from(BUCKET).remove(clean);
}

// Build PUBLIC URLs for many paths → Map of path → url.
// The bucket is public, so this is a pure string build with NO network
// round-trip — this is the speedup vs. the old createSignedUrls call.
// Kept async so existing `await signPaths(...)` callers don't need changes.
export async function signPaths(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  for (const path of unique) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (data?.publicUrl) map.set(path, data.publicUrl);
  }
  return map;
}