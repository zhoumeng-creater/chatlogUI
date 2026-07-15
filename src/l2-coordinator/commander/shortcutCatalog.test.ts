import { describe, expect, it } from "vitest";
import {
  buildShortcutHelpCatalog,
  getShortcutContextId,
  shouldHandleShortcutHelpKey,
} from "./shortcutCatalog";
import { deriveSearchShortcutFacts } from "./useShortcutHelpCommander";

describe("shortcutCatalog", () => {
  it("builds a privacy-safe search catalog with only relevant shortcut groups", () => {
    const catalog = buildShortcutHelpCatalog({
      route: "/search",
      privacyOn: true,
      hasSearchResults: true,
      canLoadMoreSearchResults: true,
      handledShortcutIds: ["search-execute", "search-clear", "search-next-result", "search-previous-result"],
      privateContextLabel: "Synthetic Private Query",
    });

    expect(catalog.contextId).toBe("search");
    expect(catalog.title).toBe("搜索帮助");
    expect(catalog.description).toBe("查看当前页面说明、主要操作和可用快捷键。");
    expect(catalog.overview).toMatchObject({
      title: "搜索聊天记录",
      description: "搜索页用于在聊天数据中查找关键词，并通过筛选、结果列表和上下文跳转定位原始消息。",
    });
    expect(catalog.overview.items).toEqual(expect.arrayContaining([
      "先输入关键词，再按需要切换会话范围、时间或消息类型筛选。",
      "搜索结果只显示必要摘要，隐私模式开启时会保留结构并遮罩具体内容。",
    ]));
    expect(catalog.groups.map((group) => group.id)).toEqual(["global", "search"]);
    expect(catalog.groups.flatMap((group) => group.shortcuts).map((item) => item.actionLabel)).toEqual(
      expect.arrayContaining(["打开页面帮助", "执行搜索", "下一条搜索结果", "加载更多结果"]),
    );
    expect(JSON.stringify(catalog)).not.toContain("Synthetic Private Query");
  });

  it("enables search result navigation only when results and real handlers exist", () => {
    const disabledCatalog = buildShortcutHelpCatalog({
      route: "/search",
      hasSearchResults: false,
      canLoadMoreSearchResults: true,
      handledShortcutIds: ["search-execute", "search-clear"],
    });
    const disabledSearchGroup = disabledCatalog.groups.find((group) => group.id === "search");
    expect(disabledSearchGroup?.shortcuts.find((item) => item.id === "search-next-result")).toMatchObject({
      enabled: false,
      disabledReason: "当前没有搜索结果。",
    });
    expect(disabledSearchGroup?.shortcuts.find((item) => item.id === "search-load-more")).toMatchObject({
      enabled: false,
      disabledReason: "此快捷键尚未在当前页面启用。",
    });

    const enabledCatalog = buildShortcutHelpCatalog({
      route: "/search",
      hasSearchResults: true,
      canLoadMoreSearchResults: true,
      handledShortcutIds: ["search-execute", "search-clear", "search-next-result", "search-previous-result"],
    });
    const enabledSearchGroup = enabledCatalog.groups.find((group) => group.id === "search");
    expect(enabledSearchGroup?.shortcuts.find((item) => item.id === "search-next-result")).toMatchObject({
      enabled: true,
      disabledReason: null,
    });
    expect(enabledSearchGroup?.shortcuts.find((item) => item.id === "search-load-more")).toMatchObject({
      enabled: false,
      disabledReason: "此快捷键尚未在当前页面启用。",
    });
  });

  it("derives search shortcut availability from the canonical result window", () => {
    expect(
      deriveSearchShortcutFacts({
        browseMode: "manual",
        retainedHits: [{}],
        currentPageHits: [],
        hasPrevious: false,
        hasNext: true,
      }),
    ).toEqual({ hasResults: true, canLoadMore: true });
    expect(deriveSearchShortcutFacts(null)).toEqual({ hasResults: false, canLoadMore: false });
  });

  it("does not advertise global or module shortcuts without handlers", () => {
    const catalog = buildShortcutHelpCatalog({
      route: "/graph",
      privacyOn: false,
      canReturn: true,
      graphReady: true,
      handledShortcutIds: ["help", "close-overlay", "toggle-privacy"],
    });
    const global = catalog.groups.find((group) => group.id === "global");
    const graph = catalog.groups.find((group) => group.id === "graph");

    expect(global?.shortcuts.find((item) => item.id === "toggle-privacy")).toMatchObject({
      enabled: true,
      disabledReason: null,
    });
    expect(global?.shortcuts.find((item) => item.id === "return-context")).toMatchObject({
      enabled: false,
      disabledReason: "此快捷键尚未在当前页面启用。",
    });
    expect(graph?.shortcuts.find((item) => item.id === "graph-fit")).toMatchObject({
      enabled: false,
      disabledReason: "此快捷键尚未在当前页面启用。",
    });
  });

  it("marks context actions unavailable instead of advertising commands that cannot work", () => {
    const catalog = buildShortcutHelpCatalog({
      route: "/workbench",
      hasCurrentConversation: false,
      hasSearchAnchor: false,
      selectionModeAvailable: false,
    });

    const chatGroup = catalog.groups.find((group) => group.id === "chat");
    expect(chatGroup).toBeDefined();
    expect(chatGroup?.shortcuts.find((item) => item.id === "chat-copy-selected")).toMatchObject({
      enabled: false,
      disabledReason: "先进入消息选择模式。",
    });
    expect(chatGroup?.shortcuts.find((item) => item.id === "chat-back-to-latest")).toMatchObject({
      enabled: false,
      disabledReason: "先选择一个会话。",
    });
  });

  it("maps setup, settings, AI, graph and analytics routes to structural contexts", () => {
    expect(getShortcutContextId("/")).toBe("setup");
    expect(getShortcutContextId("/settings?category=privacy")).toBe("settings");
    expect(getShortcutContextId("/ai")).toBe("ai");
    expect(getShortcutContextId("/graph")).toBe("graph");
    expect(getShortcutContextId("/analytics")).toBe("analytics");
  });

  it("opens help with ? or Ctrl/Cmd+/ while ignoring editable targets", () => {
    expect(shouldHandleShortcutHelpKey({
      key: "?",
      ctrlKey: false,
      metaKey: false,
      shiftKey: true,
      targetTagName: "body",
      targetRole: null,
      isContentEditable: false,
    })).toBe(true);
    expect(shouldHandleShortcutHelpKey({
      key: "/",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      targetTagName: "div",
      targetRole: null,
      isContentEditable: false,
    })).toBe(true);
    expect(shouldHandleShortcutHelpKey({
      key: "/",
      ctrlKey: false,
      metaKey: false,
      shiftKey: true,
      targetTagName: "div",
      targetRole: null,
      isContentEditable: false,
    })).toBe(true);
    expect(shouldHandleShortcutHelpKey({
      key: "?",
      ctrlKey: false,
      metaKey: false,
      shiftKey: true,
      targetTagName: "textarea",
      targetRole: null,
      isContentEditable: false,
    })).toBe(false);
  });
});
