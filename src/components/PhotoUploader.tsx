"use client";

import { useRef, useState, useEffect } from "react";
import { ImagePlus, X } from "lucide-react";

interface PhotoUploaderProps {
  multiple?: boolean;
  label?: string;
  onFilesChange: (files: File[]) => void;
}

export default function PhotoUploader({
  multiple = false,
  label = "Lisää kuva",
  onFilesChange,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const next = multiple ? [...files, ...picked] : picked.slice(0, 1);
    setFiles(next);
    onFilesChange(next);
    e.target.value = "";
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
      >
        <ImagePlus size={18} />
        {label}
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