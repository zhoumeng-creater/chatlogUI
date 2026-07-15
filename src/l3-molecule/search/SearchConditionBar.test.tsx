import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SearchDraft } from "@l2/commander/searchDraftModel";
import type {
  SearchDirectoryKind,
  SearchDirectoryModel,
} from "@l2/commander/searchDirectoryModel";
import {
  buildDirectoryPickerSections,
  getSearchDraftStatusText,
  resolveCompositeFocusIndex,
  SearchConditionBar,
  shouldCancelSearchDraftOnConditionEscape,
  shouldCloseSearchConditionMenuOnTab,
  shouldCloseSearchConditionPanelOnBlur,
} from "./SearchConditionBar";

const callbacks = {
  onConditionIntent: vi.fn(),
  onCancelDraft: vi.fn(),
  onClearDirectorySelection: vi.fn(),
  onDateShortcut: vi.fn(),
  onOpenConversationWorkspace: vi.fn(),
  onDirectoryQueryChange: vi.fn(),
  onDirectorySearch: vi.fn(),
  onDirectoryLoadMore: vi.fn(),
  onToggleDirectorySelection: vi.fn(),
  dirtySources: [],
  validationErrors: {},
  dateErrors: {},
};

function defaultDraft(): SearchDraft {
  return {
    keyword: "",
    scope: { kind: "all" },
    categories: [],
    senderIds: [],
    dateRange: {},
  };
}

function directory(kind: SearchDirectoryKind): SearchDirectoryModel {
  return {
    kind,
    query: "",
    pageSize: 50,
    status: "idle",
    loadingMode: null,
    pendingRequestToken: null,
    items: [],
    selected: [],
    dataRevision: "",
    totalCount: 0,
    hasMore: false,
    nextCursor: "",
    error: null,
  };
}

describe("SearchConditionBar", () => {
  it("renders one compact condition system and omits fake unsupported filters", () => {
    const html = renderToStaticMarkup(
      <SearchConditionBar
        {...callbacks}
        draft={defaultDraft()}
        pending={false}
        currentConversation={null}
        conversationDirectory={directory("conversation")}
        senderDirectory={directory("sender")}
        senderCapability={false}
        privacyOn={false}
      />,
    );

    expect(html).toContain("全部会话");
    expect(html).toContain("全部消息类型");
    expect(html).toContain('aria-label="开始日期"');
    expect(html).not.toContain("更多筛选");
    expect(html).not.toContain("收藏筛选");
    expect(html).not.toContain("附件筛选");
    expect(html).not.toContain("高级筛选");
  });

  it("exposes the complete nine-category multi-select taxonomy", () => {
    const html = renderToStaticMarkup(
      <SearchConditionBar
        {...callbacks}
        draft={{ ...defaultDraft(), categories: ["text", "voice"] }}
        pending={false}
        currentConversation={null}
        conversationDirectory={directory("conversation")}
        senderDirectory={directory("sender")}
        senderCapability={false}
        privacyOn={false}
        openPanel="categories"
      />,
    );

    for (const label of [
      "文字",
      "图片与表情",
      "视频",
      "语音",
      "文件",
      "链接与卡片",
      "引用与转发",
      "位置",
      "系统与其他",
    ]) {
      expect(html).toContain(label);
    }
    expect(html.match(/role="menuitemcheckbox"/g)).toHaveLength(9);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(2);
  });

  it("fails current scope closed with a nearby recovery action", () => {
    const html = renderToStaticMarkup(
      <SearchConditionBar
        {...callbacks}
        draft={{
          ...defaultDraft(),
          keyword: "needle",
          scope: { kind: "current", chatId: null },
        }}
        pending={false}
        currentConversation={null}
        conversationDirectory={directory("conversation")}
        senderDirectory={directory("sender")}
        senderCapability={false}
        privacyOn={false}
        validationErrors={{
          scope: "无法确定当前会话，请选择会话或切换到全部会话",
        }}
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("无法确定当前会话，请选择会话或切换到全部会话");
    expect(html).toContain(">选择会话</button>");
    expect(html).toContain(">改为全部会话</button>");
    expect(html).not.toContain("unknown-private-chat");
  });

  it("shows real directory options but removes their raw labels in privacy mode", () => {
    const conversationDirectory: SearchDirectoryModel = {
      ...directory("conversation"),
      query: "PRIVATE directory query",
      status: "ready",
      dataRevision: "revision-1",
      totalCount: 2,
      items: [
        {
          kind: "conversation",
          id: "private-conversation-id",
          displayName: "PRIVATE conversation",
          disambiguator: "PRIVATE disambiguator",
          conversationKind: "direct",
        },
        {
          kind: "conversation",
          id: "private-conversation-id-2",
          displayName: "PRIVATE conversation two",
          disambiguator: "PRIVATE disambiguator two",
          conversationKind: "group",
        },
      ],
    };
    const html = renderToStaticMarkup(
      <SearchConditionBar
        {...callbacks}
        draft={{ ...defaultDraft(), keyword: "needle" }}
        pending={false}
        currentConversation={null}
        conversationDirectory={conversationDirectory}
        senderDirectory={directory("sender")}
        senderCapability
        privacyOn
        openPanel="conversations"
      />,
    );

    expect(html).not.toContain("PRIVATE conversation");
    expect(html).not.toContain("PRIVATE disambiguator");
    expect(html).not.toContain("PRIVATE directory query");
    expect(html).not.toContain("private-conversation-id");
    expect(html).toContain("会话 1（名称已隐藏）");
    expect(html).toContain("会话 2（名称已隐藏）");
    expect(html).toContain('type="password"');
    expect(html).toContain('value="••••••••"');
    expect(html).toContain("更多筛选");
  });

  it("keeps stable results while exposing cancel in the condition row", () => {
    const applied = { ...defaultDraft(), keyword: "needle" };
    const html = renderToStaticMarkup(
      <SearchConditionBar
        {...callbacks}
        draft={{ ...applied, categories: ["file"] }}
        dirtySources={["categories"]}
        pending={false}
        currentConversation={null}
        conversationDirectory={directory("conversation")}
        senderDirectory={directory("sender")}
        senderCapability={false}
        privacyOn={false}
      />,
    );

    expect(html).toContain("筛选尚未应用");
    expect(html).toContain("取消修改");
    expect(html).not.toContain("应用筛选");
  });

  it.each([
    { name: "keyword-only", sources: ["keyword"] as const, text: "修改尚未应用" },
    { name: "filter-only", sources: ["categories"] as const, text: "筛选尚未应用" },
    {
      name: "keyword-and-filter",
      sources: ["keyword", "categories"] as const,
      text: "筛选尚未应用",
    },
  ])("offers one cancel action for $name edits", ({ sources, text }) => {
    const html = renderToStaticMarkup(
      <SearchConditionBar
        {...callbacks}
        draft={{ ...defaultDraft(), keyword: "changed", categories: ["file"] }}
        dirtySources={[...sources]}
        pending={false}
        currentConversation={null}
        conversationDirectory={directory("conversation")}
        senderDirectory={directory("sender")}
        senderCapability={false}
        privacyOn={false}
      />,
    );

    expect(getSearchDraftStatusText([...sources])).toBe(text);
    expect(html).toContain(text);
    expect(html).toContain("取消修改");
    expect(html).not.toContain("重置筛选");
    expect(shouldCancelSearchDraftOnConditionEscape("Escape", null, [...sources])).toBe(true);
  });

  it("keeps selected conversations visible across replacement queries and deduplicates results", () => {
    const alice = {
      kind: "conversation" as const,
      id: "conversation-alice",
      displayName: "Alice selected conversation",
      disambiguator: "Alice context",
      conversationKind: "direct" as const,
    };
    const bob = {
      ...alice,
      id: "conversation-bob",
      displayName: "Bob query result",
      disambiguator: "Bob context",
    };
    const model = {
      ...directory("conversation"),
      query: "Bob",
      status: "ready" as const,
      selected: [alice, alice],
      items: [bob, bob],
      totalCount: 1,
    };
    const draft = {
      ...defaultDraft(),
      scope: { kind: "selected" as const, chatIds: [alice.id] },
    };
    const sections = buildDirectoryPickerSections("conversation", model, draft);
    expect(sections.selected).toEqual([alice]);
    expect(sections.results).toEqual([bob]);
    expect(sections.unresolvedSelectedCount).toBe(0);

    const html = renderToStaticMarkup(
      <SearchConditionBar
        {...callbacks}
        draft={draft}
        pending={false}
        currentConversation={null}
        conversationDirectory={model}
        senderDirectory={directory("sender")}
        senderCapability
        privacyOn={false}
        openPanel="conversations"
      />,
    );
    expect(html.match(/aria-pressed="true"/gu)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/gu)).toHaveLength(1);
    expect(html).toContain("取消选择：Alice selected conversation");
  });

  it("keeps selected senders manageable and privacy-safe after query replacement", () => {
    const alice = {
      kind: "sender" as const,
      id: "sender-private-alice-id",
      displayName: "PRIVATE Alice sender",
      disambiguator: "PRIVATE sender context",
      isSelf: false,
      conversationCount: 1,
      contextLabel: "1 个会话",
    };
    const bob = { ...alice, id: "sender-private-bob-id", displayName: "PRIVATE Bob sender" };
    const model = {
      ...directory("sender"),
      query: "PRIVATE Bob",
      status: "ready" as const,
      selected: [alice],
      items: [bob, bob],
      totalCount: 1,
    };
    const draft = { ...defaultDraft(), senderIds: [alice.id] };
    const sections = buildDirectoryPickerSections("sender", model, draft);
    expect(sections.selected).toEqual([alice]);
    expect(sections.results).toEqual([bob]);

    const html = renderToStaticMarkup(
      <SearchConditionBar
        {...callbacks}
        draft={draft}
        pending={false}
        currentConversation={null}
        conversationDirectory={directory("conversation")}
        senderDirectory={model}
        senderCapability
        privacyOn
        openPanel="senders"
      />,
    );
    for (const secret of [alice.id, bob.id, alice.displayName, bob.displayName, model.query]) {
      expect(html).not.toContain(secret);
    }
    expect(html).toContain("发送者 1（名称已隐藏）");
    expect(html).toContain("清空全部已选（1）");
  });

  it("offers a safe clear-all fallback for restored draft ids missing from the directory page", () => {
    const restoredId = "raw-restored-private-conversation-id";
    const draft = {
      ...defaultDraft(),
      scope: { kind: "selected" as const, chatIds: [restoredId] },
    };
    const sections = buildDirectoryPickerSections("conversation", directory("conversation"), draft);
    expect(sections.selected).toEqual([]);
    expect(sections.unresolvedSelectedCount).toBe(1);

    const html = renderToStaticMarkup(
      <SearchConditionBar
        {...callbacks}
        draft={draft}
        pending={false}
        currentConversation={null}
        conversationDirectory={directory("conversation")}
        senderDirectory={directory("sender")}
        senderCapability={false}
        privacyOn={false}
        openPanel="conversations"
      />,
    );
    expect(html).toContain("清空全部已选（1）");
    expect(html).not.toContain(restoredId);
  });

  it("keeps arrow-key focus inside condition menus", () => {
    expect(resolveCompositeFocusIndex("ArrowDown", 8, 9)).toBe(0);
    expect(resolveCompositeFocusIndex("ArrowUp", 0, 9)).toBe(8);
    expect(resolveCompositeFocusIndex("Home", 5, 9)).toBe(0);
    expect(resolveCompositeFocusIndex("End", 0, 9)).toBe(8);
    expect(resolveCompositeFocusIndex("Enter", 0, 9)).toBeNull();
    expect(shouldCloseSearchConditionMenuOnTab("Tab")).toBe(true);
    expect(shouldCloseSearchConditionMenuOnTab("Escape")).toBe(false);
    expect(shouldCloseSearchConditionPanelOnBlur(true, false)).toBe(true);
    expect(shouldCloseSearchConditionPanelOnBlur(true, true)).toBe(false);
    expect(shouldCloseSearchConditionPanelOnBlur(true, false, false)).toBe(false);
  });
});
