"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import PhotoLightbox from "@/components/PhotoLightbox";
import type { eventPhoto } from "@/lib/db/types";

interface PhotoGalleryProps {
  photos: eventPhoto[];
  onRequestDelete?: (photoId: string) => void;
}

// "13.6. klo 14.15"
function formatStamp(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()}.${d.getMonth() + 1}. klo ${hh}.${mm}`;
}

export default function PhotoGallery({
  photos,
  onRequestDelete,
}: PhotoGalleryProps) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (photos.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {photos.map((p, i) => (
          <div key={p.id} className="relative w-28 h-28 shrink-0 snap-start">
            {p.url ? (
              <img
                src={p.url}
                alt=""
                loading="lazy"
                decoding="async"
                onClick={() => setOpenAt(i)}
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

      {openAt !== null && (
        <PhotoLightbox
          photos={photos.map((p, i) => ({
            url: p.url,
            name: `kuva-${i + 1}.jpg`,
            // shows in the lightbox if eventPhoto carries created_at
            caption: formatStamp((p as any).created_at),
          }))}
          startIndex={openAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}