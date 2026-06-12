"use client";

import { useState } from "react";
import PhotoLightbox from "@/components/PhotoLightbox";

interface GalleryPhoto {
  url: string | null;
  name: string;
}

export default function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  return (
    <>
      {/* 3 columns, NO gaps between cells, but the grid itself is inset from
          the page edges by the layout's px-5. Square cells. */}
      <div className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden">
        {photos.map((p, i) => (
          <button
            key={i}
            onClick={() => setOpenAt(i)}
            className="aspect-square"
            aria-label={`Kuva ${i + 1}`}
          >
            {p.url && (
              <img
                src={p.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tapping opens the scrollable lightbox (arrows + download built in) */}
      {openAt !== null && (
        <PhotoLightbox
          photos={photos.map((p) => ({ url: p.url, name: p.name }))}
          startIndex={openAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}