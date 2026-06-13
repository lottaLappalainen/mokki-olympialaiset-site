// src/components/PhotoLightbox.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

export interface LightboxPhoto {
  url: string | null;
  name?: string;     // used for the download filename
  caption?: string;  // optional overlay text, e.g. "13.6. klo 14.15"
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

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + photos.length) % photos.length),
    [photos.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % photos.length),
    [photos.length],
  );

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
      window.open(current.url!, "_blank");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(16, 33, 30, 0.85)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar: download + close */}
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

      {/* Image wrapper — relative so the caption can sit over the photo */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <img
          src={current.url}
          alt=""
          decoding="async"
          className="max-h-[85vh] max-w-full rounded-xl object-contain"
        />

        {/* Timestamp overlay — semi-transparent black pill, white text,
            sitting in the lower part of the photo (not flush at the bottom).
            Nudged up a little more when a counter is showing. */}
        {current.caption && (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ bottom: many ? "18%" : "12%" }}
          >
            <span
              className="text-paper text-sm font-medium px-3 py-1.5 rounded-full"
              style={{ background: "rgba(16, 33, 30, 0.6)" }}
            >
              {current.caption}
            </span>
          </div>
        )}
      </div>

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

      {many && (
        <span className="absolute bottom-5 text-paper text-sm font-medium">
          {index + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}