import { describe, expect, it } from "vitest";
import { createSemanticSSEParser } from "./sseParser";

describe("createSemanticSSEParser", () => {
  it("parses named delta, done, and error events", () => {
    const parser = createSemanticSSEParser();

    expect(parser.push('event: delta\ndata: {"text":"partial"}\n\n')).toEqual([
      { type: "delta", text: "partial" },
    ]);
    expect(parser.push('event: done\ndata: {"answer":"final","evidence":[{"chat":"wxid_a"}],"reason":"done"}\n\n')).toEqual([
      {
        type: "done",
        payload: {
          answer: "final",
          evidence: [{ chat: "wxid_a" }],
          reason: "done",
          metadata: {},
          sourceCount: 0,
          window: "",
          depth: "",
          rerankTried: false,
          rerankApplied: false,
          rerankError: "",
        },
      },
    ]);
    expect(parser.push('event: error\ndata: {"error":"provider failed"}\n\n')).toEqual([
      { type: "error", error: "provider failed" },
    ]);
  });

  it("handles network chunks split across event and data lines", () => {
    const parser = createSemanticSSEParser();

    expect(parser.push("event: del")).toEqual([]);
    expect(parser.push('ta\ndata: {"text":"hel')).toEqual([]);
    expect(parser.push('lo"}\n\n')).toEqual([{ type: "delta", text: "hello" }]);
  });

  it("handles multiple data lines in one SSE message", () => {
    const parser = createSemanticSSEParser();

    const events = parser.push('event: done\ndata: {"answer":"final",\ndata: "reason":"complete"}\n\n');

    expect(events).toEqual([
      {
        type: "done",
        payload: {
          answer: "final",
          evidence: [],
          reason: "complete",
          metadata: {},
          sourceCount: 0,
          window: "",
          depth: "",
          rerankTried: false,
          rerankApplied: false,
          rerankError: "",
        },
      },
    ]);
  });

  it("keeps unknown events non-fatal", () => {
    const parser = createSemanticSSEParser();

    expect(parser.push('event: heartbeat\ndata: {"ok":true}\n\n')).toEqual([
      { type: "unknown", event: "heartbeat", payload: { ok: true } },
    ]);
  });

  it("represents done events with no answer as an empty final payload", () => {
    const parser = createSemanticSSEParser();

    expect(parser.push('event: done\ndata: {"evidence":[]}\n\n')).toEqual([
      {
        type: "done",
        payload: {
          answer: "",
          evidence: [],
          reason: "",
          metadata: {},
          sourceCount: 0,
          window: "",
          depth: "",
          rerankTried: false,
          rerankApplied: false,
          rerankError: "",
        },
      },
    ]);
  });
});
