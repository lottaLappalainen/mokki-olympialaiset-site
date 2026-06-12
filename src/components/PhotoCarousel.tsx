"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import PhotoLightbox from "@/components/PhotoLightbox";

// Minimal shape the carousel needs — both SpacePhoto and eventPhoto satisfy it.
interface CarouselPhoto {
  id: string;
  url: string | null;
}

interface PhotoCarouselProps {
  photos: CarouselPhoto[];
  intervalMs?: number; // per-photo duration (default slow: 6s)
  onRequestDelete?: (photoId: string) => void; // when set, shows a delete button
}

export default function PhotoCarousel({
  photos,
  intervalMs = 6000,
  onRequestDelete,
}: PhotoCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Start on a RANDOM photo each mount.
  const [index, setIndex] = useState(() =>
    photos.length ? Math.floor(Math.random() * photos.length) : 0,
  );
  const [lightboxAt, setLightboxAt] = useState<number | null>(null);
  const pausedRef = useRef(false);

  // On mount, jump (no animation) to the random starting slide.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (slide) track.scrollTo({ left: slide.offsetLeft, behavior: "auto" });
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slow auto-advance; pauses while touched/hovered or while lightbox is open.
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      if (pausedRef.current || lightboxAt !== null) return;
      setIndex((i) => (i + 1) % photos.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [photos.length, intervalMs, lightboxAt]);

  // Smooth-scroll the active slide into view when index changes.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (slide) track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }, [index]);

  // Keep index synced when the user swipes manually.
  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index) setIndex(i);
  }

  if (photos.length === 0) return null;

  return (
    <div className="-mx-5 mb-5">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onPointerDown={() => (pausedRef.current = true)}
        onPointerUp={() => (pausedRef.current = false)}
        onPointerCancel={() => (pausedRef.current = false)}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth
                   [scrollbar-width:none] [-ms-overflow-style:none]
                   [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, i) => (
          <div key={p.id} className="w-full shrink-0 snap-center px-5">
            <div className="relative">
              {p.url ? (
                <img
                  src={p.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onClick={() => setLightboxAt(i)}
                  className="w-full h-44 rounded-2xl object-cover bg-surface cursor-pointer"
                />
              ) : (
                <div className="w-full h-44 rounded-2xl bg-surface" />
              )}

              {/* Delete button — only when editing (onRequestDelete passed) */}
              {onRequestDelete && (
                <button
                  type="button"
                  onClick={() => onRequestDelete(p.id)}
                  aria-label="Poista kuva"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-wine text-paper flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {photos.map((p, i) => (
            <button
              key={p.id}
              aria-label={`Kuva ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-wine" : "w-1.5 bg-mint-100"
              }`}
            />
          ))}
        </div>
      )}

      {lightboxAt !== null && (
        <PhotoLightbox
          photos={photos.map((p, i) => ({ url: p.url, name: `kuva-${i + 1}.jpg` }))}
          startIndex={lightboxAt}
          onClose={() => setLightboxAt(null)}
        />
      )}
    </div>
  );
}
