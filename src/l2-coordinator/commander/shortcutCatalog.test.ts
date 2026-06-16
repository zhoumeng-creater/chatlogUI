import { describe, expect, it } from "vitest";
import {
  buildShortcutHelpCatalog,
  getShortcutContextId,
  shouldHandleShortcutHelpKey,
} from "./shortcutCatalog";

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
    expect(catalog.groups.map((group) => group.id)).toEqual(["global", "search"]);
    expect(catalog.groups.flatMap((group) => group.shortcuts).map((item) => item.actionLabel)).toEqual(
      expect.arrayContaining(["打开快捷键帮助", "执行搜索", "下一条搜索结果", "加载更多结果"]),
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
