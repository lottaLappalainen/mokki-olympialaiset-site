"use client";

import { useState, useTransition } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";
import PhotoUploader from "@/components/PhotoUploader";

interface PlayerFormProps {
  initialName?: string;
  initialPhotoUrl?: string | null;
  submitLabel: string;
  // Receives FormData with "name" and (if chosen) "photo".
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  // When true, asks the parent to confirm before running onSubmit.
  confirmFirst?: (formData: FormData) => void;
}

export default function PlayerForm({
  initialName = "",
  initialPhotoUrl = null,
  submitLabel,
  onSubmit,
  onCancel,
  confirmFirst,
}: PlayerFormProps) {
  const [name, setName] = useState(initialName);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.append("name", name.trim());
    if (file) fd.append("photo", file);
    return fd;
  }

  function submit() {
    if (!name.trim()) {
      setError("Anna nimi.");
      return;
    }
    setError(null);
    const fd = buildFormData();
    if (confirmFirst) {
      confirmFirst(fd);
      return;
    }
    startTransition(async () => {
      await onSubmit(fd);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <PlayerAvatar
          name={name || "?"}
          photoUrl={file ? URL.createObjectURL(file) : initialPhotoUrl}
          size={88}
        />
      </div>

      <input
        className="input text-lg"
        placeholder="Pelaajan nimi"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <PhotoUploader
        label={initialPhotoUrl || file ? "Vaihda kuva" : "Lisää kuva"}
        onFilesChange={(files) => setFile(files[0] ?? null)}
      />

      <button className="btn btn-primary" onClick={submit} disabled={isPending}>
        {isPending ? "Tallennetaan…" : submitLabel}
      </button>
      {onCancel && (
        <button className="btn btn-soft" onClick={onCancel} disabled={isPending}>
          Peruuta
        </button>
      )}
      {error && <p className="text-wine font-medium text-center">{error}</p>}
    </div>
  );
}