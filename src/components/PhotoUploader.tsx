"use client";

import { useRef, useState, useEffect } from "react";
import { ImagePlus, X } from "lucide-react";
import { compressImage } from "@/lib/images/compress";

interface PhotoUploaderProps {
  multiple?: boolean;
  label?: string;
  onFilesChange: (files: File[]) => void;
  resetKey?: number; // bump this from the parent to clear the picker after save
}

export default function PhotoUploader({
  multiple = false,
  label = "Lisää kuva",
  onFilesChange,
  resetKey = 0,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Build/revoke object-URL previews (no leaks).
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  // When the parent bumps resetKey (i.e. after a successful save), clear
  // the picked files + previews so they don't linger as duplicates.
  useEffect(() => {
    if (resetKey > 0) setFiles([]);
  }, [resetKey]);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;

    setBusy(true);
    const compressed = await Promise.all(picked.map((f) => compressImage(f)));
    setBusy(false);

    const next = multiple ? [...files, ...compressed] : compressed.slice(0, 1);
    setFiles(next);
    onFilesChange(next);
  }

  function remove(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onFilesChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative">
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-20 h-20 rounded-xl object-cover bg-surface"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Poista kuva"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-wine text-paper flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn-soft"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <ImagePlus size={18} />
        {busy ? "Pakataan…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={handleSelect}
      />
    </div>
  );
}