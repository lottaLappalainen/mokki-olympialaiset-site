"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import { addSpacePhoto } from "@/lib/db/settings";

export default function GalleryAddPhoto() {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [busy, startTransition] = useTransition();

  return (
    <div className="mb-5 flex flex-col gap-3">
      <PhotoUploader
        multiple
        label="Lisää kuva"
        onFilesChange={setPhotos}
        resetKey={resetKey}
      />
      {photos.length > 0 && (
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              for (const file of photos) {
                const fd = new FormData();
                fd.append("photo", file);
                await addSpacePhoto(fd);
              }
              setPhotos([]);
              setResetKey((k) => k + 1); // clear previews
              router.refresh();
            })
          }
        >
          {busy ? "Tallennetaan…" : `Tallenna ${photos.length} kuvaa`}
        </button>
      )}
    </div>
  );
}