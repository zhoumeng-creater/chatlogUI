import type { ChatAnchorSource, ChatAnchorStatus, ChatMessageAnchor } from "@l2/data-clerk/stores/useChatStore";

export interface TranscriptPositionMessage {
  id: string;
  localId: number;
  time: string;
  timestamp: number;
}

export type TranscriptPositionRow =
  | { kind: "date"; id: string; dateLabel: string }
  | { kind: "message"; id: string; message: TranscriptPositionMessage };

export type TranscriptControlId =
  | "latest"
  | "bottom"
  | "return-anchor"
  | "previous-hit"
  | "next-hit";

export interface TranscriptControlView {
  id: TranscriptControlId;
  label: string;
  disabled: boolean;
  disabledReason: string | null;
}

export interface TranscriptPositionModel {
  stickyDateLabel: string | null;
  positionText: string | null;
  topTerminalText: string | null;
  bottomTerminalText: string | null;
  anchorLabel: string | null;
  controls: TranscriptControlView[];
}

const ANCHOR_LABELS: Record<ChatAnchorSource, { source: string; returnLabel: string }> = {
  search: { source: "来自搜索结果", returnLabel: "回到命中" },
  media: { source: "来自媒体", returnLabel: "回到媒体" },
  ai: { source: "来自 AI 证据", returnLabel: "回到证据" },
  graph: { source: "来自图谱", returnLabel: "回到图谱" },
  sns: { source: "来自朋友圈", returnLabel: "回到动态" },
};

export function deriveTranscriptPositionModel({
  rows,
  visibleIndexes,
  messagesHasMore,
  nearLatest,
  activeAnchor,
  anchorStatus,
}: {
  rows: TranscriptPositionRow[];
  visibleIndexes: number[];
  messagesHasMore: boolean;
  nearLatest: boolean;
  activeAnchor: ChatMessageAnchor | null;
  anchorStatus: ChatAnchorStatus;
}): TranscriptPositionModel {
  const firstVisibleIndex = visibleIndexes.length > 0 ? Math.min(...visibleIndexes) : -1;
  const lastVisibleIndex = visibleIndexes.length > 0 ? Math.max(...visibleIndexes) : -1;
  const visibleMessage = findVisibleMessage(rows, visibleIndexes);
  const stickyDateLabel = findStickyDateLabel(rows, firstVisibleIndex);
  const anchorCopy = activeAnchor ? ANCHOR_LABELS[activeAnchor.source] : null;
  const anchorDisabled = !activeAnchor || anchorStatus === "loading";
  const singleHitReason = activeAnchor ? "当前只知道一个命中锚点。" : "没有搜索命中锚点。";

  return {
    stickyDateLabel,
    positionText: visibleMessage ? `当前查看：${visibleMessage.time} 附近` : null,
    topTerminalText: !messagesHasMore && firstVisibleIndex <= 1 && rows.length > 0 ? "已到最早消息" : null,
    bottomTerminalText: nearLatest && lastVisibleIndex >= rows.length - 1 ? "已到最新消息" : null,
    anchorLabel: anchorCopy?.source ?? null,
    controls: [
      {
        id: "latest",
        label: "回到最新",
        disabled: nearLatest,
        disabledReason: nearLatest ? "已经在最新消息附近。" : null,
      },
      {
        id: "bottom",
        label: "回到底部",
        disabled: nearLatest,
        disabledReason: nearLatest ? "已经在底部。" : null,
      },
      {
        id: "return-anchor",
        label: anchorCopy?.returnLabel ?? "回到命中",
        disabled: anchorDisabled,
        disabledReason: anchorDisabled ? "当前没有可定位的来源锚点。" : null,
      },
      {
        id: "previous-hit",
        label: "上一条命中",
        disabled: true,
        disabledReason: singleHitReason,
      },
      {
        id: "next-hit",
        label: "下一条命中",
        disabled: true,
        disabledReason: singleHitReason,
      },
    ],
  };
}

function findVisibleMessage(
  rows: TranscriptPositionRow[],
  visibleIndexes: number[],
): TranscriptPositionMessage | null {
  for (const index of [...visibleIndexes].sort((a, b) => a - b)) {
    const row = rows[index];
    if (row?.kind === "message") return row.message;
  }
  return null;
}

function findStickyDateLabel(rows: TranscriptPositionRow[], startIndex: number): string | null {
  if (startIndex < 0) return null;
  for (let index = Math.min(startIndex, rows.length - 1); index >= 0; index -= 1) {
    const row = rows[index];
    if (row?.kind === "date") return row.dateLabel;
    if (row?.kind === "message") {
      const match = row.message.time.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
  }
  return null;
}
