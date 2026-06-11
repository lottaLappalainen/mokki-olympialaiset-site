interface PlayerAvatarProps {
  name: string;
  photoUrl?: string | null;
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
  size = 48,
  className = "",
}: PlayerAvatarProps) {
  const style = { width: size, height: size };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={style}
        className={`rounded-full object-cover bg-surface ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-surface-2 text-ink flex items-center justify-center font-semibold ${className}`}
    >
      <span style={{ fontSize: size * 0.36 }}>{initials(name)}</span>
    </div>
  );
}