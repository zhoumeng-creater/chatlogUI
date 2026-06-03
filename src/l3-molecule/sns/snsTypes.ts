export type SnsPostContentType = "text" | "image" | "video" | "article" | "finder" | "unknown";
export type SnsMediaKind = "image" | "video" | "live_photo" | "unknown";
export type SnsNotificationType = "like" | "comment" | "unknown";

export interface AdaptedSnsAuthor {
  username: string;
  displayName: string;
}

export interface AdaptedSnsMedia {
  id: string;
  kind: SnsMediaKind;
  redactedEndpointLabel: "sns:media-proxy";
  width?: number;
  height?: number;
  duration?: string;
  sensitiveSrc?: string;
  sensitiveThumbSrc?: string;
}

export interface AdaptedSnsArticle {
  title: string;
  description: string;
  hasExternalUrl: boolean;
}

export interface AdaptedSnsFinder {
  nickname: string;
  description: string;
  mediaCount: number;
  duration: string;
}

export interface AdaptedSnsPost {
  id: string;
  timestamp: number | null;
  time: string;
  author: AdaptedSnsAuthor;
  content: string;
  contentType: SnsPostContentType;
  media: AdaptedSnsMedia[];
  mediaCount: number;
  locationSummary: string;
  article: AdaptedSnsArticle | null;
  finder: AdaptedSnsFinder | null;
  hasRawContent: boolean;
}

export interface AdaptedSnsNotification {
  id: string;
  type: SnsNotificationType;
  timestamp: number | null;
  time: string;
  actor: AdaptedSnsAuthor;
  content: string;
  feedId: string;
  feedPreview: string;
}
