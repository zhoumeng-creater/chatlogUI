import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceScopeModel } from "@l2/commander/workspaceScopeModel";
import { WorkspaceScopeController } from "./WorkspaceScopeController";

describe("WorkspaceScopeController", () => {
  it("renders active scope chips with individual clear actions and privacy-safe labels", () => {
    const html = renderToStaticMarkup(
      <WorkspaceScopeController
        model={buildSearchModel()}
        onClearChip={vi.fn()}
        onReset={vi.fn()}
        onSelectMessageType={vi.fn()}
        onSelectScope={vi.fn()}
      />,
    );

    expect(html).toContain("搜索范围");
    expect(html).toContain("范围：当前会话（已隐藏）");
    expect(html).toContain("消息类型：图片");
    expect(html).toContain("定位：上下文定位");
    expect(html).toContain("清除消息类型");
    expect(html).toContain("清除定位");
    expect(html).toContain("重置范围");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('tabindex="-1"');
    expect(html).not.toContain("room_synthetic_secret");
    expect(html).not.toContain("Synthetic Private Room");
    expect(html).not.toContain("synthetic query text");
  });

  it("links disabled scope reasons to unavailable controls", () => {
    const html = renderToStaticMarkup(
      <WorkspaceScopeController model={buildAnalyticsModel()} />,
    );

    expect(html).toContain("统计暂不支持全部会话");
    expect(html).toContain("ui-disabled-reason--compact");
    expect(html).toContain("aria-describedby=");
    expect(html).toContain("时间：近 7 天");
  });

  it("keeps reset disabled with a plain reason when there is nothing to clear", () => {
    const html = renderToStaticMarkup(
      <WorkspaceScopeController model={buildEmptySearchModel()} />,
    );

    expect(html).toContain("当前没有可清除的范围条件。");
    expect(html).toContain("disabled");
    expect(html).toContain("ui-button--md");
  });
});

function buildSearchModel(): WorkspaceScopeModel {
  return {
    moduleId: "search",
    title: "搜索范围",
    summaryLabel: "当前会话（已隐藏）",
    summaryDescription: "切换范围或消息类型会取消旧搜索并按新范围重新检索。",
    activeChips: [
      {
        id: "scope",
        label: "范围",
        value: "当前会话（已隐藏）",
        field: "scopeKind",
        sensitivity: "structural",
        capability: { field: "scopeKind", status: "backend-applied" },
        clearable: true,
        clearAction: { type: "setScope", scopeKind: "allConversations" },
        ariaLabel: "范围：当前会话（已隐藏）",
      },
      {
        id: "messageType",
        label: "消息类型",
        value: "图片",
        field: "messageType",
        sensitivity: "structural",
        capability: { field: "messageType", status: "backend-applied" },
        clearable: true,
        clearAction: { type: "clearField", field: "messageType" },
        ariaLabel: "消息类型：图片",
      },
      {
        id: "focusMessage",
        label: "定位",
        value: "上下文定位",
        field: "focusMessage",
        sensitivity: "sensitive",
        capability: { field: "focusMessage", status: "readonly", reason: "上下文定位来自上一页，可清除后返回普通范围。" },
        clearable: true,
        clearAction: { type: "clearField", field: "focusMessage" },
        ariaLabel: "定位：上下文定位",
      },
    ],
    scopeOptions: [
      {
        kind: "currentConversation",
        label: "当前会话",
        selected: true,
        disabled: false,
        disabledReason: null,
        capability: { field: "scopeKind", status: "backend-applied" },
      },
      {
        kind: "allConversations",
        label: "全部会话",
        selected: false,
        disabled: false,
        disabledReason: null,
        capability: { field: "scopeKind", status: "backend-applied" },
      },
    ],
    messageTypeOptions: [
      {
        value: "all",
        label: "全部类型",
        selected: false,
        disabled: false,
        disabledReason: null,
        capability: { field: "messageType", status: "backend-applied" },
      },
      {
        value: "image",
        label: "图片",
        selected: true,
        disabled: false,
        disabledReason: null,
        capability: { field: "messageType", status: "backend-applied" },
      },
    ],
    disabledReasons: [],
    canReset: true,
    resetDisabledReason: null,
    announcement: "搜索范围已更新，范围：当前会话（已隐藏），消息类型：图片，定位：上下文定位",
    pending: false,
  };
}

function buildAnalyticsModel(): WorkspaceScopeModel {
  return {
    ...buildEmptySearchModel(),
    moduleId: "analytics",
    title: "统计范围",
    summaryLabel: "全部会话",
    summaryDescription: "统计暂不支持全部会话；请从会话工作台选择一个会话查看统计。",
    activeChips: [
      {
        id: "scope",
        label: "范围",
        value: "全部会话",
        field: "scopeKind",
        sensitivity: "structural",
        capability: {
          field: "scopeKind",
          status: "disabled",
          reason: "统计暂不支持全部会话；请从会话工作台选择一个会话查看统计。",
        },
        clearable: false,
        clearAction: null,
        ariaLabel: "范围：全部会话",
      },
      {
        id: "dateRange",
        label: "时间",
        value: "近 7 天",
        field: "dateRange",
        sensitivity: "structural",
        capability: { field: "dateRange", status: "readonly", reason: "统计时间窗口当前固定为近 7 天。" },
        clearable: false,
        clearAction: null,
        ariaLabel: "时间：近 7 天",
      },
    ],
    scopeOptions: [
      {
        kind: "currentConversation",
        label: "当前会话",
        selected: false,
        disabled: true,
        disabledReason: "先选择一个会话后再查看统计。",
        capability: { field: "scopeKind", status: "disabled", reason: "先选择一个会话后再查看统计。" },
      },
      {
        kind: "allConversations",
        label: "全部会话",
        selected: true,
        disabled: true,
        disabledReason: "统计暂不支持全部会话；请从会话工作台选择一个会话查看统计。",
        capability: {
          field: "scopeKind",
          status: "disabled",
          reason: "统计暂不支持全部会话；请从会话工作台选择一个会话查看统计。",
        },
      },
    ],
    disabledReasons: [
      "先选择一个会话后再查看统计。",
      "统计暂不支持全部会话；请从会话工作台选择一个会话查看统计。",
      "统计时间窗口当前固定为近 7 天。",
    ],
  };
}

function buildEmptySearchModel(): WorkspaceScopeModel {
  return {
    moduleId: "search",
    title: "搜索范围",
    summaryLabel: "全部会话",
    summaryDescription: "切换范围或消息类型会取消旧搜索并按新范围重新检索。",
    activeChips: [
      {
        id: "scope",
        label: "范围",
        value: "全部会话",
        field: "scopeKind",
        sensitivity: "structural",
        capability: { field: "scopeKind", status: "backend-applied" },
        clearable: false,
        clearAction: null,
        ariaLabel: "范围：全部会话",
      },
    ],
    scopeOptions: [
      {
        kind: "currentConversation",
        label: "当前会话",
        selected: false,
        disabled: true,
        disabledReason: "先选择一个会话。选择会话后可搜索当前会话。",
        capability: {
          field: "scopeKind",
          status: "disabled",
          reason: "先选择一个会话。选择会话后可搜索当前会话。",
        },
      },
      {
        kind: "allConversations",
        label: "全部会话",
        selected: true,
        disabled: false,
        disabledReason: null,
        capability: { field: "scopeKind", status: "backend-applied" },
      },
    ],
    messageTypeOptions: [
      {
        value: "all",
        label: "全部类型",
        selected: true,
        disabled: false,
        disabledReason: null,
        capability: { field: "messageType", status: "backend-applied" },
      },
    ],
    disabledReasons: ["先选择一个会话。选择会话后可搜索当前会话。"],
    canReset: false,
    resetDisabledReason: "当前没有可清除的范围条件。",
    announcement: "搜索范围已更新，范围：全部会话",
    pending: false,
  };
}
