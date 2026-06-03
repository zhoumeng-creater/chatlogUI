import { FileText, Image, MapPin, PlaySquare, UserRound } from "lucide-react";
import { Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";
import {
  formatSnsArticleSummary,
  formatSnsAuthor,
  formatSnsContentPreview,
  formatSnsContentTypeLabel,
  formatSnsFinderSummary,
  formatSnsLocationSummary,
  formatSnsTime,
  buildSnsHighlightedSegments,
} from "./snsDisplay";
import type { AdaptedSnsPost } from "./snsTypes";

interface SnsTimelineProps {
  posts: AdaptedSnsPost[];
  selectedPostId: string | null;
  privacyOn: boolean;
  emptyCopy: string;
  highlightQuery?: string;
  onSelectPost: (postId: string | null) => void;
}

export function SnsTimeline({
  posts,
  selectedPostId,
  privacyOn,
  emptyCopy,
  highlightQuery = "",
  onSelectPost,
}: SnsTimelineProps) {
  if (posts.length === 0) {
    return (
      <div className="sns-module__empty">
        <Typography variant="label" weight={700}>
          {emptyCopy}
        </Typography>
      </div>
    );
  }

  return (
    <div className="sns-timeline" aria-label="朋友圈时间线">
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          className={classNames("sns-post-row", selectedPostId === post.id && "sns-post-row--selected")}
          onClick={() => onSelectPost(post.id)}
        >
          <div className="sns-post-row__avatar" aria-hidden="true">
            <UserRound size={16} />
          </div>
          <div className="sns-post-row__main">
            <div className="sns-post-row__top">
              <span className="sns-post-row__author">{formatSnsAuthor(post, privacyOn)}</span>
              <span className="sns-post-row__time">{formatSnsTime(post.time, privacyOn)}</span>
            </div>
            <PostContentPreview
              text={formatSnsContentPreview(post, privacyOn)}
              highlightQuery={privacyOn ? "" : highlightQuery}
            />
            <PostChips post={post} privacyOn={privacyOn} />
          </div>
        </button>
      ))}
    </div>
  );
}

function PostContentPreview({
  text,
  highlightQuery,
}: {
  text: string;
  highlightQuery: string;
}) {
  const segments = buildSnsHighlightedSegments(text, highlightQuery);

  return (
    <span className="sns-post-row__content">
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={`${segment.text}-${index}`} className="sns-post-row__highlight">
            {segment.text}
          </mark>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        ),
      )}
    </span>
  );
}

function PostChips({ post, privacyOn }: { post: AdaptedSnsPost; privacyOn: boolean }) {
  const article = formatSnsArticleSummary(post, privacyOn);
  const finder = formatSnsFinderSummary(post, privacyOn);
  const location = formatSnsLocationSummary(post, privacyOn);

  return (
    <div className="sns-post-row__chips" aria-label="动态摘要">
      <span className="sns-post-row__chip">
        <FileText size={12} />
        {formatSnsContentTypeLabel(post.contentType)}
      </span>
      {post.mediaCount > 0 && (
        <span className="sns-post-row__chip">
          <Image size={12} />
          {privacyOn ? "已隐藏媒体" : `${post.mediaCount} 项媒体`}
        </span>
      )}
      {article && (
        <span className="sns-post-row__chip">
          <FileText size={12} />
          {article}
        </span>
      )}
      {finder && (
        <span className="sns-post-row__chip">
          <PlaySquare size={12} />
          {finder}
        </span>
      )}
      {location && (
        <span className="sns-post-row__chip">
          <MapPin size={12} />
          {location}
        </span>
      )}
    </div>
  );
}
