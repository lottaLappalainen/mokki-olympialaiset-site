// src/components/PhotoLightbox.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

export interface LightboxPhoto {
  url: string | null;
  name?: string; // used for the download filename
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  startIndex?: number;
  onClose: () => void;
}

export default function PhotoLightbox({
  photos,
  startIndex = 0,
  onClose,
}: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const many = photos.length > 1;

  // Wrap around at both ends.
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + photos.length) % photos.length),
    [photos.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % photos.length),
    [photos.length],
  );

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (many && e.key === "ArrowLeft") prev();
      if (many && e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [many, prev, next, onClose]);

  const current = photos[index];
  if (!current?.url) return null;

  // Download by fetching the (signed) URL into a blob, then a temp <a>.
  async function download() {
    try {
      const res = await fetch(current.url!);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = current.name || `kuva-${index + 1}.jpg`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      // If the fetch fails (e.g. expired URL), open it in a new tab instead.
      window.open(current.url!, "_blank");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(16, 33, 30, 0.85)" }}
      onClick={onClose} // backdrop click closes
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar: download + close (stopPropagation so they don't close) */}
      <div
        className="absolute top-4 right-4 flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={download}
          aria-label="Lataa kuva"
          className="w-10 h-10 rounded-full bg-paper text-ink flex items-center justify-center"
        >
          <Download size={20} />
        </button>
        <button
          onClick={onClose}
          aria-label="Sulje"
          className="w-10 h-10 rounded-full bg-paper text-ink flex items-center justify-center"
        >
          <X size={20} />
        </button>
      </div>

      {/* Prev arrow (only when there's more than one) */}
      {many && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Edellinen"
          className="absolute left-3 w-10 h-10 rounded-full bg-paper text-ink flex items-center justify-center"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* The image itself — clicking it should NOT close the modal */}
      <img
        src={current.url}
        alt=""
        decoding="async"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-xl object-contain"
      />

      {/* Next arrow */}
      {many && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Seuraava"
          className="absolute right-3 w-10 h-10 rounded-full bg-paper text-ink flex items-center justify-center"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Counter, e.g. "2 / 5" */}
      {many && (
        <span className="absolute bottom-5 text-paper text-sm font-medium">
          {index + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}