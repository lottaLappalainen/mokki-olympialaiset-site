"use client";

import { Trash2 } from "lucide-react";
import type { eventPhoto } from "@/lib/db/types";

interface PhotoGalleryProps {
  photos: eventPhoto[];
  onRequestDelete?: (photoId: string) => void;
}

export default function PhotoGallery({
  photos,
  onRequestDelete,
}: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p) => (
        <div key={p.id} className="relative aspect-square">
          {p.url ? (
            <img
              src={p.url}
              alt=""
              className="w-full h-full rounded-xl object-cover bg-surface"
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
  );
}