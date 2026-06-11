"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Vahvista",
  cancelLabel = "Peruuta",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(16, 33, 30, 0.45)" }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink mb-1">{title}</h2>
        {message && <p className="text-sm text-ink/80 mb-4">{message}</p>}
        <div className="flex flex-col gap-2 mt-2">
          <button
            className={`btn ${destructive ? "btn-accent" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "…" : confirmLabel}
          </button>
          <button className="btn btn-soft" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}