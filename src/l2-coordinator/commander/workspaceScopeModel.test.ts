import { describe, expect, it } from "vitest";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { buildWorkspaceRouteScopeView } from "./workspaceRouteScope";
import {
  buildWorkspaceScopeModel,
  toPersistableWorkspaceScope,
  type WorkspaceScopeState,
} from "./workspaceScopeModel";

describe("workspaceScopeModel", () => {
  it("builds a search scope controller with backend-applied current/all scope and message type chips", () => {
    const routeScope = buildWorkspaceRouteScopeView({
      scope: "currentChat",
      scopedChat: "room_private_001",
      source: "search",
      focus: "private query text",
      conversations: [
        conversation({
          id: "c1",
          username: "room_private_001",
          displayName: "Private Room",
        }),
      ],
      privacyOn: true,
    });

    const model = buildWorkspaceScopeModel({
      moduleId: "search",
      routeScope,
      state: {
        kind: "currentConversation",
        messageType: "image",
        sourceRoute: "search",
        focusMessage: "private query text",
      },
      pending: false,
    });

    expect(model.title).toBe("搜索范围");
    expect(model.scopeOptions.map((option) => [option.kind, option.capability.status])).toEqual([
      ["currentConversation", "backend-applied"],
      ["allConversations", "backend-applied"],
    ]);
    expect(model.activeChips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scope",
          label: "范围",
          value: "当前会话（已隐藏）",
          clearable: true,
          capability: expect.objectContaining({ status: "backend-applied" }),
        }),
        expect.objectContaining({
          id: "messageType",
          label: "消息类型",
          value: "图片",
          clearAction: { type: "clearField", field: "messageType" },
        }),
        expect.objectContaining({
          id: "focusMessage",
          label: "定位",
          value: "上下文定位",
          clearable: true,
        }),
      ]),
    );
    const visibleCopy = [
      model.summaryLabel,
      model.summaryDescription,
      model.announcement,
      ...model.activeChips.flatMap((chip) => [chip.value, chip.ariaLabel]),
    ].join(" ");
    expect(visibleCopy).not.toContain("room_private_001");
    expect(visibleCopy).not.toContain("Private Room");
    expect(visibleCopy).not.toContain("private query text");
  });

  it("marks unsupported analytics global/date scope with plain disabled reasons", () => {
    const routeScope = buildWorkspaceRouteScopeView({
      scope: "all",
      scopedChat: null,
      conversations: [],
      selectedConversation: null,
      privacyOn: false,
      defaultScope: "all",
    });

    const model = buildWorkspaceScopeModel({
      moduleId: "analytics",
      routeScope,
      state: {
        kind: "allConversations",
        dateRange: { preset: "7d" },
      },
      pending: false,
    });

    expect(model.scopeOptions.find((option) => option.kind === "allConversations")).toMatchObject({
      selected: true,
      disabled: true,
      disabledReason: "统计暂不支持全部会话；请从会话工作台选择一个会话查看统计。",
      capability: { field: "scopeKind", status: "disabled", reason: "统计暂不支持全部会话；请从会话工作台选择一个会话查看统计。" },
    });
    expect(model.activeChips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "dateRange",
          label: "时间",
          value: "近 7 天",
          capability: expect.objectContaining({ status: "readonly" }),
          clearable: false,
        }),
      ]),
    );
    expect(model.disabledReasons).toContain("统计暂不支持全部会话；请从会话工作台选择一个会话查看统计。");
    expect(model.messageTypeOptions).toEqual([]);
  });

  it("uses controller state instead of route context when an all-scope search is active", () => {
    const routeScope = buildWorkspaceRouteScopeView({
      scope: "currentChat",
      scopedChat: "room_private_001",
      conversations: [
        conversation({
          id: "c1",
          username: "room_private_001",
          displayName: "Private Room",
        }),
      ],
      privacyOn: true,
    });

    const model = buildWorkspaceScopeModel({
      moduleId: "search",
      routeScope,
      state: { kind: "allConversations", messageType: "all" },
    });

    expect(model.activeChips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scope",
          value: "全部会话",
        }),
      ]),
    );
  });

  it("represents SNS backend author filters without exposing raw user identifiers", () => {
    const model = buildWorkspaceScopeModel({
      moduleId: "sns",
      routeScope: buildWorkspaceRouteScopeView({
        scope: "all",
        conversations: [],
        selectedConversation: null,
        privacyOn: true,
        defaultScope: "all",
      }),
      state: {
        kind: "allConversations",
        selectedContacts: [{ id: "wxid_synthetic_author", label: "Synthetic Author" }],
        dateRange: { start: "2026-06-01", end: "2026-06-13" },
        snsContentType: "image",
        snsMediaOnly: true,
      },
    });

    expect(model.activeChips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "selectedContacts",
          label: "作者",
          value: "已选择作者",
          sensitivity: "sensitive",
          capability: expect.objectContaining({ status: "backend-applied" }),
          clearAction: { type: "clearField", field: "selectedContacts" },
        }),
      ]),
    );
    const visibleCopy = model.activeChips.flatMap((chip) => [chip.value, chip.ariaLabel]).join(" ");
    expect(visibleCopy).not.toContain("wxid_synthetic_author");
    expect(visibleCopy).not.toContain("Synthetic Author");
  });

  it("serializes only structural scope fields and drops sensitive selections", () => {
    const state: WorkspaceScopeState = {
      kind: "selectedContacts",
      selectedContacts: [
        { id: "wxid_synthetic_001", label: "Synthetic Contact" },
      ],
      selectedGroups: [
        { id: "room_private_002", label: "Private Group" },
      ],
      sourceRoute: "ai",
      focusMessage: "private message body",
      dateRange: { start: "2026-06-01", end: "2026-06-13" },
      messageType: "file",
      mediaType: "image",
    };

    expect(toPersistableWorkspaceScope(state)).toEqual({
      kind: "selectedContacts",
      sourceRoute: "ai",
      dateRange: { start: "2026-06-01", end: "2026-06-13" },
      messageType: "file",
      mediaType: "image",
    });
  });
});

function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: "session-id",
    username: "session",
    displayName: "Synthetic Session",
    chatType: "private",
    isGroup: false,
    summary: "",
    timestamp: 0,
    timeLabel: "",
    unread: 0,
    lastSender: "",
    source: "session",
    ...overrides,
  };
}
