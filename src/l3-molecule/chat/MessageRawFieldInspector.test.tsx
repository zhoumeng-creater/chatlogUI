import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SafeRawFieldRow } from "@l2/commander/messageActionModel";
import inspectorSource from "./MessageRawFieldInspector.tsx?raw";
import { MessageRawFieldInspector } from "./MessageRawFieldInspector";

const rows: SafeRawFieldRow[] = [
  { label: "消息 ID", value: "message-42" },
  { label: "本地 ID", value: "42" },
  { label: "附件数量", value: "1" },
];

describe("MessageRawFieldInspector", () => {
  it("renders allowlisted raw rows as a dismissible dialog", () => {
    const html = renderToStaticMarkup(
      <MessageRawFieldInspector rows={rows} onClose={vi.fn()} />,
    );

    expect(html).toContain("安全原始字段");
    expect(html).toContain("消息 ID");
    expect(html).toContain("message-42");
    expect(html).toContain('role="dialog"');
  });

  it("uses the shared overlay focus contract for Escape, Tab, initial focus, and focus restore", () => {
    expect(inspectorSource).toContain("focusInitialOverlayTarget");
    expect(inspectorSource).toContain("restoreFocusTarget");
    expect(inspectorSource).toContain("shouldCloseOverlayOnKey");
    expect(inspectorSource).toContain("trapOverlayFocus");
  });
});
