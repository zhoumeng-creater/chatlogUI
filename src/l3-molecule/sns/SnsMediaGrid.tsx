import { useState } from "react";
import { Image, Play, Video } from "lucide-react";
import { Typography } from "@l4/ui";
import {
  formatSnsMediaTileLabel,
  formatSnsProxyErrorCopy,
} from "./snsDisplay";
import type { AdaptedSnsMedia } from "./snsTypes";

interface SnsMediaGridProps {
  media: AdaptedSnsMedia[];
  privacyOn: boolean;
}

export function SnsMediaGrid({ media, privacyOn }: SnsMediaGridProps) {
  const [failedMedia, setFailedMedia] = useState<Record<string, boolean>>({});

  if (media.length === 0) return null;

  return (
    <div className="sns-media-grid" aria-label="朋友圈媒体">
      {media.map((item) => {
        const label = formatSnsMediaTileLabel(item, privacyOn);
        const source = privacyOn ? undefined : item.sensitiveThumbSrc ?? item.sensitiveSrc;
        const failed = failedMedia[item.id] === true;

        return (
          <div key={item.id} className="sns-media-grid__tile">
            {source && !failed && item.kind !== "video" ? (
              <img
                className="sns-media-grid__image"
                src={source}
                alt={label}
                loading="lazy"
                onError={() => setFailedMedia((state) => ({ ...state, [item.id]: true }))}
              />
            ) : source && !failed && item.kind === "video" ? (
              <video
                className="sns-media-grid__video"
                src={source}
                muted
                playsInline
                preload="metadata"
                controls
                onError={() => setFailedMedia((state) => ({ ...state, [item.id]: true }))}
              />
            ) : (
              <div className="sns-media-grid__placeholder">
                {item.kind === "video" ? <Video size={18} /> : <Image size={18} />}
                <Typography variant="caption" color="var(--text-secondary)">
                  {failed ? formatSnsProxyErrorCopy() : label}
                </Typography>
              </div>
            )}
            <div className="sns-media-grid__meta">
              {item.kind === "video" ? <Play size={12} /> : <Image size={12} />}
              <span>{label}</span>
              {item.duration && <span>{privacyOn ? "已隐藏时长" : item.duration}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
