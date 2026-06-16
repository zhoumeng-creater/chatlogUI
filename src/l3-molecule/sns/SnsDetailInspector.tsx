import type { ReactNode } from "react";
import { ExternalLink, FileText, MapPin, PlaySquare, ShieldCheck, X } from "lucide-react";
import { Button, DisabledReason, Typography } from "@l4/ui";
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
  onRequestArticleOpen?: (postId: string) => void;
  onClose?: () => void;
}

export function SnsDetailInspector({ post, privacyOn, onRequestArticleOpen, onClose }: SnsDetailInspectorProps) {
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
  const articleOpenDisabledReason = getArticleOpenDisabledReason(post, privacyOn);
  const articleOpenDisabledReasonId = articleOpenDisabledReason ? `sns-article-open-disabled-${post.id}` : undefined;
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
        {onClose && (
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="关闭朋友圈详情">
            <X size={14} />
          </Button>
        )}
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
      {post.article?.hasExternalUrl && (
        <div className="sns-detail__external">
          <span>{formatArticleExternalSummary(post, privacyOn)}</span>
          {articleOpenDisabledReason ? (
            <DisabledReason id={articleOpenDisabledReasonId} reason={articleOpenDisabledReason} variant="compact">
              <Button
                variant="secondary"
                size="sm"
                disabled
                aria-describedby={articleOpenDisabledReasonId}
              >
                <ExternalLink size={14} />
                打开文章
              </Button>
            </DisabledReason>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRequestArticleOpen?.(post.id)}
            >
              <ExternalLink size={14} />
              打开文章
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function formatArticleExternalSummary(post: AdaptedSnsPost, privacyOn: boolean): string {
  const article = post.article;
  if (!article?.hasExternalUrl) return "";
  if (privacyOn) return "隐私模式下已隐藏外链域名";
  if (!article.externalDomain || !article.externalScheme) return "这条文章没有可安全确认的外链域名";
  return `${article.externalScheme.toUpperCase()} · ${article.externalDomain}`;
}

function getArticleOpenDisabledReason(post: AdaptedSnsPost, privacyOn: boolean): string | null {
  if (!post.article?.hasExternalUrl) return null;
  if (privacyOn) return "隐私模式下不打开外部文章，避免暴露浏览上下文。";
  if (!post.article.externalDomain || !post.article.externalScheme) {
    return "后端未提供可安全确认的外链域名，已阻止打开。";
  }
  return null;
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
