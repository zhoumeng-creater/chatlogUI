import { describe, expect, it } from "vitest";
import {
  bindActionableEmptyStateActions,
  buildActionableEmptyState,
} from "./actionableEmptyStateModel";

describe("actionableEmptyStateModel", () => {
  it("gates impossible actions when service or DB readiness is missing", () => {
    const model = buildActionableEmptyState({
      variant: "search-no-results",
      readiness: {
        serviceConfigured: true,
        httpReady: true,
        dbReady: false,
        hasCurrentConversation: false,
      },
      privacyOn: false,
    });

    expect(model.actions.map((action) => action.id)).toEqual(["check-service", "open-diagnostics"]);
    expect(model.actions).toHaveLength(2);
    expect(model.actions.some((action) => action.id === "search-current-conversation")).toBe(false);
    expect(model.reason).toContain("数据库");
  });

  it("offers one to three valid next actions for search, chat, AI, graph and media empty states", () => {
    const variants = [
      "no-conversation-selected",
      "search-not-started",
      "filters-no-results",
      "media-empty",
      "ai-index-required",
      "graph-empty",
    ] as const;

    for (const variant of variants) {
      const model = buildActionableEmptyState({
        variant,
        readiness: {
          serviceConfigured: true,
          httpReady: true,
          dbReady: true,
          hasCurrentConversation: variant !== "no-conversation-selected",
        },
        privacyOn: true,
      });

      expect(model.actions.length).toBeGreaterThanOrEqual(1);
      expect(model.actions.length).toBeLessThanOrEqual(3);
      expect(model.actions.every((action) => action.label.length > 0)).toBe(true);
      expect(JSON.stringify(model)).not.toContain("Synthetic Private");
      expect(JSON.stringify(model)).not.toContain("wxid_");
    }
  });

  it("keeps structural context visible in privacy mode", () => {
    const model = buildActionableEmptyState({
      variant: "conversation-empty",
      readiness: {
        serviceConfigured: true,
        httpReady: true,
        dbReady: true,
        hasCurrentConversation: true,
      },
      privacyOn: true,
      counts: {
        hiddenItems: 0,
      },
    });

    expect(model.title).toBe("当前会话暂无消息");
    expect(model.description).toContain("会话结构");
    expect(model.description).not.toContain("***");
    expect(model.actions.map((action) => action.id)).toEqual(["refresh", "choose-conversation"]);
  });

  it("does not offer current-conversation search when no conversation exists", () => {
    const model = buildActionableEmptyState({
      variant: "search-not-started",
      readiness: {
        serviceConfigured: true,
        httpReady: true,
        dbReady: true,
        hasCurrentConversation: false,
      },
      privacyOn: false,
    });

    expect(model.actions.map((action) => action.id)).toEqual(["clear-filters"]);
    expect(JSON.stringify(model)).not.toContain("搜索当前会话");
  });

  it("disables visible actions that are not supported by the owning surface", () => {
    const model = bindActionableEmptyStateActions(
      buildActionableEmptyState({
        variant: "conversation-empty",
        readiness: {
          serviceConfigured: true,
          httpReady: true,
          dbReady: true,
          hasCurrentConversation: true,
        },
        privacyOn: false,
      }),
      ["refresh"],
    );

    expect(model.actions.find((action) => action.id === "refresh")).toMatchObject({
      disabled: false,
      disabledReason: null,
    });
    expect(model.actions.find((action) => action.id === "choose-conversation")).toMatchObject({
      disabled: true,
      disabledReason: "当前区域没有接入这个操作。",
    });
  });
});
