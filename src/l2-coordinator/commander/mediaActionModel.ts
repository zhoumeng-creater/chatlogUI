import { containsUnsafeDisplayText } from "@/utils/privacyDisplay";
import type {
  MediaActionResult,
  MediaAttachment,
  MediaResourceLoadStatus,
} from "@l2/data-clerk/stores/useMediaStore";

export type MediaActionId =
  | "preview"
  | "copySummary"
  | "locateSource"
  | "openOriginal"
  | "retryResource";

export interface MediaActionItem {
  id: MediaActionId;
  label: string;
  enabled: boolean;
  disabledReason: string | null;
  requiresConfirmation: boolean;
}

export interface MediaOpenPrompt {
  attachmentId: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  url: string;
  redactedUrlLabel: string;
}

export interface MediaActionModel {
  attachmentId: string;
  copySummary: string;
  openPrompt: MediaOpenPrompt | null;
  actions: MediaActionItem[];
}

export function buildMediaActionModel({
  attachment,
  resourceUrl,
  privacyOn,
  resourceStatus,
}: {
  attachment: MediaAttachment;
  resourceUrl: string;
  privacyOn: boolean;
  resourceStatus: MediaResourceLoadStatus;
}): MediaActionModel {
  const openPrompt = createMediaOpenPrompt({ attachment, resourceUrl, privacyOn });
  const previewReason = previewDisabledReason(attachment, resourceUrl, resourceStatus);
  const locateReason = locateDisabledReason(attachment);

  return {
    attachmentId: attachment.id,
    copySummary: createMediaCopySummary(attachment, privacyOn),
    openPrompt: openPrompt.ok ? openPrompt.prompt : null,
    actions: [
      action("preview", "预览", !previewReason, previewReason, false),
      action("copySummary", "复制摘要", true, null, false),
      action("locateSource", "定位来源", !locateReason, locateReason, false),
      action("openOriginal", "打开原始资源", openPrompt.ok, openPrompt.ok ? null : openPrompt.reason, true),
      action("retryResource", "重试资源", resourceStatus === "error", resourceStatus === "error" ? null : "资源未处于失败状态。", false),
    ],
  };
}

export function createMediaCopySummary(attachment: MediaAttachment, privacyOn: boolean): string {
  return [
    `媒体类型: ${mediaKindLabel(attachment.kind)}`,
    `来源: ${attachment.sourceLabel || sourceLabel(attachment.source)}`,
    `时间: ${attachment.time || "未知时间"}`,
    `文件: ${safeFileName(attachment.fileName || attachment.label, privacyOn)}`,
    `状态: ${attachment.resourceKey || attachment.directUrl ? "可预览" : "资源缺失"}`,
    `定位: ${formatLocateLabel(attachment)}`,
  ].join("\n");
}

export function createMediaOpenPrompt({
  attachment,
  resourceUrl,
  privacyOn,
}: {
  attachment: MediaAttachment;
  resourceUrl: string;
  privacyOn: boolean;
}): { ok: true; prompt: MediaOpenPrompt } | { ok: false; reason: string } {
  if (privacyOn) {
    return { ok: false, reason: "隐私模式下不打开原始资源。" };
  }
  if (!resourceUrl.trim()) {
    return { ok: false, reason: "当前附件没有可打开的原始资源。" };
  }

  const url = parseSafeLocalResourceUrl(resourceUrl);
  if (!url) {
    return { ok: false, reason: "仅支持打开本机 HTTP/HTTPS 媒体资源。" };
  }

  return {
    ok: true,
    prompt: {
      attachmentId: attachment.id,
      title: "打开原始资源",
      message: "将通过系统浏览器打开本机 chatlog 媒体资源。不会在界面显示原始路径或密钥。",
      confirmLabel: "打开原始资源",
      cancelLabel: "取消",
      url: url.toString(),
      redactedUrlLabel: "本机媒体资源",
    },
  };
}

export function mediaActionResult(status: MediaActionResult["status"], message: string): MediaActionResult {
  return { status, message };
}

export function mediaKindLabel(kind: MediaAttachment["kind"]): string {
  if (kind === "image") return "图片";
  if (kind === "video") return "视频";
  if (kind === "voice") return "语音";
  if (kind === "file") return "文件";
  if (kind === "sticker") return "表情";
  return "媒体";
}

export function sourceLabel(source: MediaAttachment["source"]): string {
  if (source === "favorite") return "收藏";
  if (source === "new_message") return "增量消息";
  return "当前会话";
}

function action(
  id: MediaActionId,
  label: string,
  enabled: boolean,
  disabledReason: string | null,
  requiresConfirmation: boolean,
): MediaActionItem {
  return { id, label, enabled, disabledReason, requiresConfirmation };
}

function previewDisabledReason(
  attachment: MediaAttachment,
  resourceUrl: string,
  resourceStatus: MediaResourceLoadStatus,
): string | null {
  if (!resourceUrl) return "当前附件没有可用预览。";
  if (resourceStatus === "error") return "预览资源加载失败，可重试。";
  if (attachment.kind === "file" || attachment.kind === "unknown") return "该媒体类型暂不支持内嵌预览。";
  return null;
}

function locateDisabledReason(attachment: MediaAttachment): string | null {
  if (typeof attachment.localId === "number" || attachment.messageId) return null;
  return "缺少可定位消息锚点。";
}

function formatLocateLabel(attachment: MediaAttachment): string {
  if (typeof attachment.localId === "number") return `消息 ${attachment.localId}`;
  if (attachment.messageId) return "消息锚点";
  return "缺少锚点";
}

function safeFileName(value: string | undefined, privacyOn: boolean): string {
  if (privacyOn) return "已隐藏文件名";
  const trimmed = value?.trim() ?? "";
  if (!trimmed || containsUnsafeDisplayText(trimmed)) return "已隐藏文件名";
  const fileName = trimmed.split(/[\\/]/).filter(Boolean).pop() ?? trimmed;
  return containsUnsafeDisplayText(fileName) ? "已隐藏文件名" : fileName;
}

function parseSafeLocalResourceUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") return null;
    return url;
  } catch {
    return null;
  }
}
