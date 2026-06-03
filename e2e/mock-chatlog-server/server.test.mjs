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
});
