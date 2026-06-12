"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import PhotoLightbox from "@/components/PhotoLightbox";
import type { eventPhoto } from "@/lib/db/types";

interface PhotoGalleryProps {
  photos: eventPhoto[];
  onRequestDelete?: (photoId: string) => void;
}

export default function PhotoGallery({
  photos,
  onRequestDelete,
}: PhotoGalleryProps) {
  // null = closed; a number = open at that photo index.
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (photos.length === 0) return null;

  return (
    <>
      {/* Horizontal scroll strip. overflow-x-auto + shrink-0 thumbs = rolling row. */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {photos.map((p, i) => (
          <div
            key={p.id}
            className="relative w-28 h-28 shrink-0 snap-start"
          >
            {p.url ? (
              <img
                src={p.url}
                alt=""
                loading="lazy"      // only loads as it scrolls into view
                decoding="async"
                onClick={() => setOpenAt(i)} // open lightbox at this photo
                className="w-full h-full rounded-xl object-cover bg-surface cursor-pointer"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-surface" />
            )}
            {onRequestDelete && (
              <button
                type="button"
                onClick={() => onRequestDelete(p.id)}
                aria-label="Poista kuva"
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-wine text-paper flex items-center justify-center"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Shared lightbox with arrows + download */}
      {openAt !== null && (
        <PhotoLightbox
          photos={photos.map((p, i) => ({ url: p.url, name: `kuva-${i + 1}.jpg` }))}
          startIndex={openAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}