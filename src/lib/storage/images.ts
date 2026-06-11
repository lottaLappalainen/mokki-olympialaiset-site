import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "olympialaiset";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "bin";
}

// Upload a file under "{spaceId}/{folder}/{uuid}.{ext}" and return its path.
// The storage RLS insert policy verifies the first path segment == space.
export async function uploadImage(
  supabase: SupabaseClient,
  spaceId: string,
  folder: "players" | "eventt",
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

// Sign many paths in a single round-trip → Map of path → signed URL.
// (Private bucket, so a path is useless without a signature.)
export async function signPaths(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return map;

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}