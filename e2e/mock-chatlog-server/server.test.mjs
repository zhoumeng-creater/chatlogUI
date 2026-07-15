import { describe, expect, it } from "vitest";
import { startMockChatlogServer } from "./server.mjs";

describe("mock chatlog server", () => {
  it("serves route-map JSON from synthetic fixtures", async () => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    try {
      const response = await fetch(`${server.baseUrl}/api/v1/sessions?format=json`);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.sessions[0].username).toBe("session_synthetic_001");
    } finally {
      await server.close();
    }
  });

  it("serves deterministic SSE streams from fixture event arrays", async () => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    try {
      const response = await fetch(`${server.baseUrl}/api/v1/hook/stream?format=json`);
      const text = await response.text();

      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(text).toContain("event: snapshot");
      expect(text).toContain("event: hook_event");
    } finally {
      await server.close();
    }
  });

  it("selects semantic QA SSE contract states from synthetic request queries", async () => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    try {
      const emptyResponse = await fetch(`${server.baseUrl}/api/v1/semantic/qa/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "synthetic empty qa" }),
      });
      const emptyText = await emptyResponse.text();

      const failureResponse = await fetch(`${server.baseUrl}/api/v1/semantic/qa/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "synthetic failure qa" }),
      });
      const failureText = await failureResponse.text();

      expect(emptyText).toContain("synthetic empty answer");
      expect(failureText).toContain("event: error");
      expect(failureText).toContain("synthetic semantic QA failed");
    } finally {
      await server.close();
    }
  });

  it("serves graph QA through the sidecar POST contract only", async () => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    try {
      const postResponse = await fetch(`${server.baseUrl}/api/v1/graph/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "synthetic graph qa" }),
      });
      const postJson = await postResponse.json();

      const getResponse = await fetch(`${server.baseUrl}/api/v1/graph/qa`);

      expect(postResponse.status).toBe(200);
      expect(postJson.answer).toContain("Synthetic graph answer");
      expect(getResponse.status).toBe(404);
    } finally {
      await server.close();
    }
  });

  it("serves generated media placeholders without reading real media", async () => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    try {
      const response = await fetch(`${server.baseUrl}/image/media_synthetic_image_key`);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/svg+xml");
      expect(body).toContain("Synthetic media placeholder");
    } finally {
      await server.close();
    }
  });

  it("serves the strict search.v2 capability contract", async () => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    try {
      const response = await fetch(`${server.baseUrl}/api/v1/search/capabilities?format=json`);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({
        contract_version: "search.v2",
        exact_total: true,
        complete_scope: true,
        directory_version: "search.directory.v1",
        history_context_version: "history.context.v1",
        history_context_query: true,
        history_context_revision_binding: true,
      });
      expect(json.taxonomy).toEqual([
        "text",
        "image_emoji",
        "video",
        "voice",
        "file",
        "link_card",
        "quote_forward",
        "location",
        "system_other",
      ]);
    } finally {
      await server.close();
    }
  });

  it("serves deterministic search.v2 first, cursor, and zero-result pages from POST bodies", async () => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    try {
      const firstResponse = await fetch(`${server.baseUrl}/api/v1/search?format=json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: "Synthetic", limit: 50 }),
      });
      const first = await firstResponse.json();

      expect(firstResponse.status).toBe(200);
      expect(first).toMatchObject({
        snapshot_id: "snapshot-search-synthetic-v2",
        data_revision: "revision-search-synthetic-v2",
        exact_total: true,
        complete_scope: true,
        window_start: 0,
        has_previous: false,
        has_next: true,
      });
      expect(first.count).toBeGreaterThanOrEqual(3);
      expect(new Set(first.messages.map((message) => message.category)).size).toBeGreaterThan(1);
      expect(new Set(first.messages.map((message) => message.conversation_id)).size).toBeGreaterThan(1);
      expect(first.messages.map((message) => message.source_index)).toEqual(
        first.messages.map((_, index) => index),
      );

      const nextResponse = await fetch(`${server.baseUrl}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: "Synthetic",
          limit: 50,
          snapshot_id: first.snapshot_id,
          data_revision: first.data_revision,
          cursor: first.next_cursor,
        }),
      });
      const next = await nextResponse.json();
      expect(next.window_start).toBe(first.count);
      expect(next.has_previous).toBe(true);
      expect(next.previous_cursor).not.toBe("");
      expect(next.has_next).toBe(false);

      const previousResponse = await fetch(`${server.baseUrl}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: "Synthetic",
          limit: 50,
          snapshot_id: first.snapshot_id,
          data_revision: first.data_revision,
          cursor: next.previous_cursor,
        }),
      });
      const previous = await previousResponse.json();
      expect(previous.window_start).toBe(0);
      expect(previous.messages[0].message_id).toBe(first.messages[0].message_id);

      const emptyResponse = await fetch(`${server.baseUrl}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: "synthetic empty result", limit: 50 }),
      });
      const empty = await emptyResponse.json();
      expect(empty).toMatchObject({
        total_count: 0,
        count: 0,
        window_start: 0,
        previous_cursor: "",
        next_cursor: "",
        has_previous: false,
        has_next: false,
        messages: [],
      });
    } finally {
      await server.close();
    }
  });

  it("serves strict conversation and sender directory POST contracts", async () => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    try {
      const conversationResponse = await fetch(
        `${server.baseUrl}/api/v1/search/conversations/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "Synthetic", limit: 50, cursor: "", data_revision: "" }),
        },
      );
      const conversations = await conversationResponse.json();
      expect(conversationResponse.status).toBe(200);
      expect(conversations).toMatchObject({
        exact_total: true,
        complete: true,
        has_more: false,
        next_cursor: "",
      });
      expect(conversations.items.map((item) => item.kind)).toEqual(["direct", "group"]);

      const senderResponse = await fetch(`${server.baseUrl}/api/v1/search/senders/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "Synthetic",
          limit: 50,
          cursor: "",
          data_revision: "",
          scope: "all",
          chats: [],
        }),
      });
      const senders = await senderResponse.json();
      expect(senderResponse.status).toBe(200);
      expect(senders.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sender_id: "chatlog:sender:self:v1",
            is_self: true,
          }),
          expect.objectContaining({
            sender_id: "contact_synthetic_001",
            is_self: false,
          }),
        ]),
      );
    } finally {
      await server.close();
    }
  });

  it("binds exact history context to the requested conversation, seq, revision, and limit", async () => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    try {
      const response = await fetch(`${server.baseUrl}/api/v1/history/context/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: "session_synthetic_001",
          seq: 1101,
          limit: 51,
          data_revision: "revision-search-synthetic-v2",
        }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(Object.keys(json).sort()).toEqual(
        [
          "anchor_index",
          "anchor_seq",
          "complete",
          "contract_version",
          "conversation_id",
          "count",
          "data_revision",
          "exact",
          "has_after",
          "has_before",
          "limit",
          "messages",
        ].sort(),
      );
      expect(json).toMatchObject({
        contract_version: "history.context.v1",
        data_revision: "revision-search-synthetic-v2",
        exact: true,
        complete: true,
        conversation_id: "session_synthetic_001",
        anchor_seq: 1101,
        limit: 51,
      });
      expect(json.messages[json.anchor_index].seq).toBe(1101);
      expect(json.messages.every((message) => message.conversation_id === "session_synthetic_001"))
        .toBe(true);
    } finally {
      await server.close();
    }
  });
});
