import { useState } from "react";

interface AvatarProps {
  src?: string;
  alt: string;
  size?: number;
  fallback?: string;
  status?: "online" | "offline" | "away";
}

export function Avatar({
  src,
  alt,
  size = 40,
  fallback,
  status,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = fallback
    ? fallback.slice(0, 2).toUpperCase()
    : alt.slice(0, 2).toUpperCase();

  const statusColors = {
    online: "#34C759",
    offline: "#8E8E93",
    away: "#FF9500",
  };

  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src && !imgError ? (
        <img
          src={src}
          alt={alt}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-semibold text-white select-none"
          style={{
            width: size,
            height: size,
            backgroundColor: "#007AFF",
            fontSize: size * 0.35,
          }}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-white"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            backgroundColor: statusColors[status],
          }}
        />
      )}
    </div>
  );
}
