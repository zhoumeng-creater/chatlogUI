import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryContextPage } from "@/l2-coordinator/api-docs/historyContext";
import type { HistoryResponse } from "@/l2-coordinator/api-docs/history";
import {
  useChatStore,
  type ChatMessage,
  type ChatMessageAnchor,
  type ChatReturnToSearch,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { HistoryContextRequestError } from "@/l4-atom/network/fetchHistoryContext";
import { useChatCommander } from "./useChatCommander";

const networkMocks = vi.hoisted(() => ({
  fetchHistory: vi.fn(),
  fetchHistoryContext: vi.fn(),
}));

vi.mock("@l4/network", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@l4/network")>()),
  fetchHistory: networkMocks.fetchHistory,
  fetchHistoryContext: networkMocks.fetchHistoryContext,
}));

describe("useChatCommander exact search navigation", () => {
  beforeEach(() => {
    networkMocks.fetchHistory.mockReset();
    networkMocks.fetchHistoryContext.mockReset();
    useChatStore.getState().resetChat();
    useChatStore.setState({
      conversations: [conversation("current-conversation", "current-chat", "Current chat")],
      selectedConversationId: "current-conversation",
      messages: [message("current-message", "current-chat", 10)],
      messagesLoading: false,
      messagesHasMore: true,
      messagesTotalCount: 1,
      messagesOffset: 0,
      messagesStatus: "ready",
      messagesError: null,
      anchorStatus: "hit",
      activeAnchor: currentAnchor,
      highlightedMessageId: "current-message",
      returnToSearch,
      anchorError: null,
      selectionMode: true,
      selectedMessageIds: ["current-message"],
      lastSelectedMessageId: "current-message",
    });
  });

  it("keeps the current transcript transactionally intact while exact context is pending and after failure", async () => {
    const context = deferred<HistoryContextPage>();
    networkMocks.fetchHistoryContext.mockReturnValueOnce(context.promise);
    const commander = renderCommander();
    const before = navigationState();

    const outcome = commander.selectAndLoadAtAnchor(exactTarget);

    expect(navigationState()).toEqual(before);
    context.reject(new HistoryContextRequestError("history_context_stale", 409));
    await expect(outcome).resolves.toEqual({
      ok: false,
      reason: "load-failed",
      message: "搜索快照已过期，请刷新搜索后重试。",
      nearbyFallbackAvailable: false,
    });
    expect(navigationState()).toEqual(before);
  });

  it("commits the target conversation, transcript, and anchor together after exact success", async () => {
    networkMocks.fetchHistoryContext.mockResolvedValueOnce(exactPage());
    const commander = renderCommander();

    await expect(commander.selectAndLoadAtAnchor(exactTarget)).resolves.toEqual({
      ok: true,
      matchKind: "exact",
      messageId: "history-context:101",
    });

    const state = useChatStore.getState();
    expect(state.selectedConversationId).toBe("target-conversation");
    expect(state.messages.map((candidate) => candidate.id)).toEqual([
      "history-context:100",
      "history-context:101",
      "history-context:102",
    ]);
    expect(state.messagesLoading).toBe(false);
    expect(state.messagesHasNewer).toBe(true);
    expect(state.anchorStatus).toBe("hit");
    expect(state.highlightedMessageId).toBe("history-context:101");
    expect(state.activeAnchor).toEqual(exactTarget.anchor);
    expect(state.returnToSearch).toEqual(returnToSearch);
    expect(state.conversations).toContainEqual(
      expect.objectContaining({ id: "target-conversation", source: "navigation" }),
    );
  });

  it("keeps newer context honest when latest loading fails and clears it only after latest succeeds", async () => {
    networkMocks.fetchHistoryContext.mockResolvedValueOnce(exactPage());
    const commander = renderCommander();
    await commander.selectAndLoadAtAnchor(exactTarget);

    networkMocks.fetchHistory.mockRejectedValueOnce(new Error("synthetic latest failure"));
    await commander.loadHistory("target-chat");
    expect(useChatStore.getState()).toMatchObject({
      messagesHasNewer: true,
      messagesError: expect.anything(),
    });
    expect(useChatStore.getState().messages.map((candidate) => candidate.id)).toEqual([
      "history-context:100",
      "history-context:101",
      "history-context:102",
    ]);

    networkMocks.fetchHistory.mockResolvedValueOnce(latestHistoryPage());
    await commander.loadHistory("target-chat");
    expect(useChatStore.getState()).toMatchObject({
      messagesHasNewer: false,
      messagesError: null,
      scrollIntent: "latest",
    });
    expect(useChatStore.getState().messages.map((candidate) => candidate.id)).toEqual([
      "latest-message",
    ]);
  });

  it("keeps the current transcript intact when legacy exact capability returns a page without the hit", async () => {
    networkMocks.fetchHistory.mockResolvedValueOnce(legacyMissingPage());
    const commander = renderCommander();
    const before = navigationState();

    await expect(commander.selectAndLoadAtAnchor({
      ...exactTarget,
      historyContextAvailable: false,
    })).resolves.toEqual({
      ok: false,
      reason: "missing",
      message: "已加载来源会话，但无法精确定位这条消息。",
      nearbyFallbackAvailable: true,
    });

    expect(navigationState()).toEqual(before);
  });
});

function renderCommander(): ReturnType<typeof useChatCommander> {
  let commander: ReturnType<typeof useChatCommander> | null = null;
  function Harness() {
    commander = useChatCommander();
    return null;
  }
  renderToStaticMarkup(<Harness />);
  if (!commander) throw new Error("Chat commander harness did not render");
  return commander;
}

function navigationState() {
  const state = useChatStore.getState();
  return {
    conversations: state.conversations,
    selectedConversationId: state.selectedConversationId,
    messages: state.messages,
    messagesLoading: state.messagesLoading,
    messagesHasMore: state.messagesHasMore,
    messagesHasNewer: state.messagesHasNewer,
    messagesTotalCount: state.messagesTotalCount,
    messagesOffset: state.messagesOffset,
    messagesStatus: state.messagesStatus,
    messagesError: state.messagesError,
    scrollIntent: state.scrollIntent,
    scrollAnchorMessageId: state.scrollAnchorMessageId,
    scrollAnchorLocalId: state.scrollAnchorLocalId,
    anchorStatus: state.anchorStatus,
    activeAnchor: state.activeAnchor,
    highlightedMessageId: state.highlightedMessageId,
    returnToSearch: state.returnToSearch,
    anchorError: state.anchorError,
    selectionMode: state.selectionMode,
    selectedMessageIds: state.selectedMessageIds,
    lastSelectedMessageId: state.lastSelectedMessageId,
  };
}

const currentAnchor: ChatMessageAnchor = {
  source: "media",
  chat: "current-chat",
  messageId: "current-message",
  seq: 10,
  localId: 10,
  timestamp: 1_700_000_000,
  time: "2023-11-14T22:13:20.000Z",
};

const returnToSearch: ChatReturnToSearch = {
  returnRoute: "/search",
  activeResultId: "search-result-current",
  querySnapshot: {
    query: "Synthetic",
    filter: "all",
    scope: "all",
    scopeChat: null,
  },
  sourceConversationId: "current-conversation",
};

const exactTarget = {
  conversationId: "target-conversation",
  chat: "target-chat",
  conversationLabel: "Target chat",
  isGroup: false,
  dataRevision: "revision-1",
  historyContextAvailable: true,
  anchor: {
    source: "search" as const,
    chat: "target-chat",
    messageId: "target-message",
    seq: 101,
    localId: 101,
    timestamp: 1_700_000_001,
    time: "2023-11-14T22:13:21.000Z",
  },
  returnToSearch,
};

function exactPage(): HistoryContextPage {
  return {
    contractVersion: "history.context.v1",
    dataRevision: "revision-1",
    exact: true,
    complete: true,
    conversationId: "target-conversation",
    anchorSeq: 101,
    anchorIndex: 1,
    limit: 51,
    count: 3,
    hasBefore: true,
    hasAfter: true,
    messages: [
      historyMessage(100, "before"),
      historyMessage(101, "anchor"),
      historyMessage(102, "after"),
    ],
  };
}

function legacyMissingPage(): HistoryResponse {
  return {
    chat: "target-chat",
    username: "target-chat",
    isGroup: false,
    chatType: "private",
    totalCount: 1,
    count: 1,
    limit: 50,
    offset: 0,
    messages: [{
      seq: 999,
      id: "other-message",
      localId: 999,
      timestamp: 1_700_000_000,
      time: "2023-11-14T22:13:20.000Z",
      talker: "target-chat",
      sender: "sender-current",
      senderName: "Current Sender",
      isSelf: false,
      type: "1",
      subType: "0",
      content: "other content",
      chat: "target-chat",
      username: "target-chat",
      isGroup: false,
      chatType: "private",
      direction: "other",
    }],
  };
}

function latestHistoryPage(): HistoryResponse {
  return {
    chat: "target-chat",
    username: "target-chat",
    isGroup: false,
    chatType: "private",
    totalCount: 500,
    count: 1,
    limit: 50,
    offset: 0,
    messages: [{
      seq: 500,
      id: "latest-message",
      localId: 500,
      timestamp: 1_700_000_500,
      time: "2023-11-14T22:21:40.000Z",
      talker: "target-chat",
      sender: "sender-current",
      senderName: "Current Sender",
      isSelf: false,
      type: "1",
      subType: "0",
      content: "latest content",
      chat: "target-chat",
      username: "target-chat",
      isGroup: false,
      chatType: "private",
      direction: "other",
    }],
  };
}

function historyMessage(seq: number, content: string) {
  return {
    seq,
    timestamp: 1_700_000_000 + seq,
    conversationId: "target-conversation",
    conversationName: "Target chat",
    senderId: "sender-1",
    senderName: "Synthetic Sender",
    isSelf: false,
    type: 1,
    subType: 0,
    content,
  };
}

function conversation(id: string, username: string, displayName: string) {
  return {
    id,
    username,
    displayName,
    chatType: "private",
    isGroup: false,
    summary: "",
    timestamp: 1,
    timeLabel: "",
    unread: 0,
    lastSender: "",
    source: "fixture",
  };
}

function message(id: string, chat: string, seq: number): ChatMessage {
  return {
    id,
    seq,
    localId: seq,
    timestamp: 1_700_000_000,
    time: "2023-11-14T22:13:20.000Z",
    sender: "sender-current",
    senderName: "Current Sender",
    type: "1",
    content: "current content",
    chat,
    username: chat,
    isGroup: false,
    chatType: "private",
    direction: "other",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
