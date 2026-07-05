import { describe, expect, it } from "vitest";
import chatViewSource from "./ChatView.tsx?raw";
import messageListSource from "./MessageList.tsx?raw";

describe("ChatView selection layout", () => {
  it("keeps the selection command bar outside the virtualized message list", () => {
    expect(messageListSource).not.toContain("MessageSelectionToolbar");
    expect(chatViewSource).toContain("MessageSelectionToolbar");
    expect(chatViewSource).toContain('className="transcript__selection"');
  });
});
