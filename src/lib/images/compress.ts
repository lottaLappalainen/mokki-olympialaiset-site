// src/lib/images/compress.ts
"use client";

// Compress an image File to stay under a byte budget (default 1 MB).
// Strategy: cap the longest edge, draw to a canvas, then step JPEG quality
// down until the output fits. Runs entirely in the browser before upload.
const ONE_MB = 1024 * 1024;
const MAX_EDGE = 1920; // plenty for phone/desktop display; shrinks huge originals

export async function compressImage(
  file: File,
  maxBytes: number = ONE_MB,
): Promise<File> {
  // Non-images (or already-tiny files) pass straight through untouched.
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= maxBytes && file.type !== "image/png") return file;

  // Decode the file into a bitmap we can draw.
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // decode failed → keep original rather than break

  // Scale the longest edge down to MAX_EDGE (keeps aspect ratio).
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // Helper: canvas → Blob at a given JPEG quality.
  const toBlob = (q: number) =>
    new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", q),
    );

  // Step quality down until it fits (or we hit the floor).
  let quality = 0.9;
  let blob = await toBlob(quality);
  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await toBlob(quality);
  }
  if (!blob) return file;

  // Rename to .jpg since we re-encoded as JPEG.
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}