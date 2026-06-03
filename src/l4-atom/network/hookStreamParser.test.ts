import { describe, expect, it } from "vitest";
import { createHookSSEParser } from "./hookStreamParser";

describe("hookStreamParser", () => {
  it("parses split snapshot and hook_event chunks into safe events", () => {
    const parser = createHookSSEParser();
    const first = parser.push('event: snapshot\ndata: {"events":[{"id":1,"trigger_content":"Synthetic private content"}]}\n');
    const second = parser.push('\nevent: hook_event\ndata: {"id":2,"talker":"synthetic_talker","trigger_content":"Second private content"}\n\n');

    expect(first).toEqual([]);
    expect(second).toEqual([
      {
        type: "snapshot",
        events: [
          expect.objectContaining({
            id: "1",
            contentPreview: "已隐藏内容",
            contextCount: 0,
          }),
        ],
      },
      {
        type: "hook_event",
        event: expect.objectContaining({
          id: "2",
          identityLabel: "已隐藏对象",
          contentPreview: "已隐藏内容",
        }),
      },
    ]);
    expect(JSON.stringify(second)).not.toContain("private");
    expect(JSON.stringify(second)).not.toContain("synthetic_talker");
  });

  it("handles keepalive comments, malformed JSON, errors, and unknown events", () => {
    const parser = createHookSSEParser();
    const events = [
      ...parser.push([
      ": keepalive",
      "",
      "event: hook_event",
      "data: not-json",
      "",
      "event: error",
      "data: {\"error\":\"stream failed\"}",
      "",
      "event: custom",
      "data: {\"ok\":true}",
      "",
      ].join("\n")),
      ...parser.flush(),
    ];

    expect(events).toEqual([
      { type: "keepalive" },
      { type: "error", error: "Invalid hook stream payload" },
      { type: "error", error: "stream failed" },
      { type: "unknown", event: "custom" },
    ]);
  });
});
