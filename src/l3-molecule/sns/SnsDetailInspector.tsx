import type { ReactNode } from "react";
import { FileText, MapPin, PlaySquare, ShieldCheck } from "lucide-react";
import { Typography } from "@l4/ui";
import {
  formatSnsArticleSummary,
  formatSnsAuthor,
  formatSnsContentPreview,
  formatSnsContentTypeLabel,
  formatSnsFinderSummary,
  formatSnsLocationSummary,
  formatSnsTime,
} from "./snsDisplay";
import { SnsMediaGrid } from "./SnsMediaGrid";
import type { AdaptedSnsPost } from "./snsTypes";

interface SnsDetailInspectorProps {
  post: AdaptedSnsPost | null;
  privacyOn: boolean;
}

export function SnsDetailInspector({ post, privacyOn }: SnsDetailInspectorProps) {
  if (!post) {
    return (
      <div className="sns-detail sns-detail--empty">
        <Typography variant="label" weight={700}>
          选择一条动态
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          详情面板会显示动态、媒体、文章、视频号和位置摘要。
        </Typography>
      </div>
    );
  }

  const article = formatSnsArticleSummary(post, privacyOn);
  const finder = formatSnsFinderSummary(post, privacyOn);
  const location = formatSnsLocationSummary(post, privacyOn);

  return (
    <div className="sns-detail" aria-label="朋友圈详情">
      <div className="sns-detail__header">
        <div className="sns-detail__identity">
          <Typography variant="label" weight={700}>
            {formatSnsAuthor(post, privacyOn)}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {formatSnsTime(post.time, privacyOn)}
          </Typography>
        </div>
        <span className="sns-detail__type">
          <FileText size={12} />
          {formatSnsContentTypeLabel(post.contentType)}
        </span>
      </div>

      <Typography variant="body" color="var(--text-primary)">
        {formatSnsContentPreview(post, privacyOn)}
      </Typography>

      <SnsMediaGrid media={post.media} privacyOn={privacyOn} />

      <div className="sns-detail__facts">
        {article && (
          <FactRow icon={<FileText size={14} />} label="文章" value={article} />
        )}
        {finder && (
          <FactRow icon={<PlaySquare size={14} />} label="视频号" value={finder} />
        )}
        {location && (
          <FactRow icon={<MapPin size={14} />} label="位置" value={location} />
        )}
        {post.hasRawContent && (
          <FactRow icon={<ShieldCheck size={14} />} label="解析" value="已完成结构化适配" />
        )}
      </div>
    </div>
  );
}

function FactRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="sns-detail__fact">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
