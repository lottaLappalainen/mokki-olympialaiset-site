import { colorFromSeed } from "@/lib/avatarColor";

interface PlayerAvatarProps {
  name: string;
  photoUrl?: string | null;
  seed?: string; // pass the player id for a stable per-player color
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PlayerAvatar({
  name,
  photoUrl,
  seed,
  size = 48,
  className = "",
}: PlayerAvatarProps) {
  const style = { width: size, height: size };

  // Photo present → just show it.
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        style={style}
        className={`rounded-full object-cover bg-surface ${className}`}
      />
    );
  }

  // No photo → deterministic color from the seed (or name as fallback).
  const color = colorFromSeed(seed ?? name);
  return (
    <div
      style={{ ...style, backgroundColor: color.bg, color: color.text }}
      className={`rounded-full flex items-center justify-center font-semibold ${className}`}
    >
      <span style={{ fontSize: size * 0.36 }}>{initials(name)}</span>
    </div>
  );
}