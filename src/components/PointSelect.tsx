"use client";

import type { PointOption } from "@/lib/db/settings";

interface PointSelectProps {
  options: PointOption[];          // empty → free number input
  value: string;                   // current value as a string ("" = none)
  onChange: (value: string) => void;
  className?: string;
}

export default function PointSelect({
  options,
  value,
  onChange,
  className = "",
}: PointSelectProps) {
  // No configured options → behave like the old free number field.
  if (options.length === 0) {
    return (
      <input
        type="number"
        inputMode="numeric"
        className={`input text-center ${className}`}
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // Configured → dropdown of allowed values only (plus an empty "–" choice).
  return (
    <select
      className={`input ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">–</option>
      {options.map((o) => (
        <option key={o.id} value={String(o.value)}>
          {/* show "10" or "10 – 1. sija" when a label exists */}
          {o.label ? `${o.value} – ${o.label}` : o.value}
        </option>
      ))}
    </select>
  );
}