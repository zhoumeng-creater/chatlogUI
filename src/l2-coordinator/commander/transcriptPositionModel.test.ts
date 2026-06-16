import { describe, expect, it } from "vitest";
import type { ChatMessageAnchor } from "@l2/data-clerk/stores/useChatStore";
import {
  deriveTranscriptPositionModel,
  type TranscriptPositionRow,
} from "./transcriptPositionModel";

const rows: TranscriptPositionRow[] = [
  { kind: "date", id: "date:2024-04-27", dateLabel: "2024-04-27" },
  {
    kind: "message",
    id: "message:1",
    message: { id: "1", localId: 1, time: "2024-04-27 23:58", timestamp: 1_714_254_000 },
  },
  { kind: "date", id: "date:2024-04-28", dateLabel: "2024-04-28" },
  {
    kind: "message",
    id: "message:2",
    message: { id: "2", localId: 2, time: "2024-04-28 09:20", timestamp: 1_714_288_000 },
  },
];

const searchAnchor: ChatMessageAnchor = {
  source: "search",
  chat: "synthetic-room",
  messageId: "2",
  localId: 2,
  timestamp: 1_714_288_000,
  time: "2024-04-28 09:20",
};

describe("transcriptPositionModel", () => {
  it("derives sticky date and visible position text from visible rows", () => {
    expect(deriveTranscriptPositionModel({
      rows,
      visibleIndexes: [2, 3],
      messagesHasMore: true,
      nearLatest: false,
      activeAnchor: null,
      anchorStatus: "idle",
    })).toMatchObject({
      stickyDateLabel: "2024-04-28",
      positionText: "当前查看：2024-04-28 09:20 附近",
      topTerminalText: null,
      bottomTerminalText: null,
    });
  });

  it("distinguishes top and bottom terminal states", () => {
    expect(deriveTranscriptPositionModel({
      rows,
      visibleIndexes: [0, 1],
      messagesHasMore: false,
      nearLatest: false,
      activeAnchor: null,
      anchorStatus: "idle",
    }).topTerminalText).toBe("已到最早消息");

    expect(deriveTranscriptPositionModel({
      rows,
      visibleIndexes: [2, 3],
      messagesHasMore: false,
      nearLatest: true,
      activeAnchor: null,
      anchorStatus: "idle",
    }).bottomTerminalText).toBe("已到最新消息");
  });

  it("shows latest terminal state at the transcript bottom even when older history is available", () => {
    expect(deriveTranscriptPositionModel({
      rows,
      visibleIndexes: [2, 3],
      messagesHasMore: true,
      nearLatest: true,
      activeAnchor: null,
      anchorStatus: "idle",
    }).bottomTerminalText).toBe("已到最新消息");
  });

  it("exposes search anchor return controls and honest disabled previous-next state", () => {
    const model = deriveTranscriptPositionModel({
      rows,
      visibleIndexes: [3],
      messagesHasMore: false,
      nearLatest: false,
      activeAnchor: searchAnchor,
      anchorStatus: "hit",
    });

    expect(model.anchorLabel).toBe("来自搜索结果");
    expect(model.controls.find((control) => control.id === "return-anchor")).toMatchObject({
      label: "回到命中",
      disabled: false,
    });
    expect(model.controls.find((control) => control.id === "previous-hit")?.disabledReason)
      .toBe("当前只知道一个命中锚点。");
    expect(model.controls.find((control) => control.id === "next-hit")?.disabledReason)
      .toBe("当前只知道一个命中锚点。");
  });

  it("uses source-specific anchor copy for non-search anchors", () => {
    const model = deriveTranscriptPositionModel({
      rows,
      visibleIndexes: [3],
      messagesHasMore: false,
      nearLatest: false,
      activeAnchor: { ...searchAnchor, source: "ai" },
      anchorStatus: "missing",
    });

    expect(model.anchorLabel).toBe("来自 AI 证据");
    expect(model.controls.find((control) => control.id === "return-anchor")?.label).toBe("回到证据");
  });
});
