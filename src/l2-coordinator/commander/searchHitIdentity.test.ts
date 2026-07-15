import { describe, expect, it } from "vitest";
import { createSearchHitIdentity } from "./searchHitIdentity";

const base = {
  conversationId: "PRIVATE-conversation",
  messageId: "PRIVATE-message",
  seq: 42,
};

describe("searchHitIdentity", () => {
  it("is stable for the same composite backend identity and keeps source ids opaque", () => {
    const identity = createSearchHitIdentity(base);

    expect(identity).toBe(createSearchHitIdentity({ ...base }));
    expect(identity).toMatch(/^search-hit-[a-f0-9]{32}$/);
    expect(identity).not.toContain(base.conversationId);
    expect(identity).not.toContain(base.messageId);
  });

  it.each([
    { conversationId: "another-conversation" },
    { messageId: "another-message" },
    { seq: 43 },
  ])("changes when one composite identity part changes: %#j", (change) => {
    expect(createSearchHitIdentity({ ...base, ...change })).not.toBe(
      createSearchHitIdentity(base),
    );
  });
});
