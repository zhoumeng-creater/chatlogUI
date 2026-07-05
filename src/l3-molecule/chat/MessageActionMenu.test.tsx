import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MessageActionModel } from "@l2/commander/messageActionModel";
import actionMenuSource from "./MessageActionMenu.tsx?raw";
import { MessageActionMenu } from "./MessageActionMenu";

const model: MessageActionModel = {
  actions: [
    { id: "select-message", label: "选择消息", enabled: true, disabledReason: null, requiresConfirmation: false },
    { id: "copy-message", label: "复制消息", enabled: true, disabledReason: null, requiresConfirmation: false },
    { id: "copy-time", label: "复制时间", enabled: true, disabledReason: null, requiresConfirmation: false },
    { id: "find-similar", label: "查找同类消息", enabled: false, disabledReason: "当前后端暂不支持同类消息搜索。", requiresConfirmation: false },
    { id: "view-safe-raw-fields", label: "查看安全原始字段", enabled: true, disabledReason: null, requiresConfirmation: false },
  ],
};

describe("MessageActionMenu", () => {
  it("renders row actions without leaking message content into labels", () => {
    const html = renderToStaticMarkup(
      <MessageActionMenu
        model={model}
        open={false}
        onToggleOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="消息操作"');
    expect(html).toContain("选择消息");
    expect(html).toContain("复制消息");
    expect(html).toContain("查看安全原始字段");
    expect(html).toContain("当前后端暂不支持同类消息搜索。");
    expect(html).not.toContain("Synthetic private message body");
  });

  it("uses the shared overlay focus contract for menu keyboard operation", () => {
    expect(actionMenuSource).toContain("focusInitialOverlayTarget");
    expect(actionMenuSource).toContain("restoreFocusTarget");
    expect(actionMenuSource).toContain("shouldCloseOverlayOnKey");
    expect(actionMenuSource).toContain("trapOverlayFocus");
  });

  it("does not attach visible hover tooltip copy to the standard ellipsis trigger", () => {
    const html = renderToStaticMarkup(
      <MessageActionMenu
        model={model}
        open={false}
        onToggleOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="打开消息操作"');
    expect(html).not.toContain('role="tooltip"');
  });
});
