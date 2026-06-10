import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHATLOG_SERVICE_BASE_URL,
  buildChatlogApiUrl,
  formatChatlogServiceLabel,
  validateChatlogServiceBaseUrl,
} from "./chatlogEndpoint";

describe("chatlog endpoint contract", () => {
  it("normalizes supported loopback origins", () => {
    expect(validateChatlogServiceBaseUrl("127.0.0.1:5030")).toEqual({
      ok: true,
      baseUrl: "http://127.0.0.1:5030",
      host: "127.0.0.1",
      port: 5030,
    });
    expect(validateChatlogServiceBaseUrl("http://127.0.0.1:5030/")).toMatchObject({
      ok: true,
      baseUrl: "http://127.0.0.1:5030",
    });
    expect(validateChatlogServiceBaseUrl("localhost:5031")).toMatchObject({
      ok: true,
      baseUrl: "http://localhost:5031",
      host: "localhost",
      port: 5031,
    });
    expect(DEFAULT_CHATLOG_SERVICE_BASE_URL).toBe("http://127.0.0.1:5030");
  });

  it("rejects unsupported protocols, remote hosts, and path-bearing inputs", () => {
    expect(validateChatlogServiceBaseUrl("https://127.0.0.1:5030")).toMatchObject({
      ok: false,
      error: expect.stringContaining("HTTP"),
    });
    expect(validateChatlogServiceBaseUrl("http://192.168.1.10:5030")).toMatchObject({
      ok: false,
      error: expect.stringContaining("本机"),
    });
    expect(validateChatlogServiceBaseUrl("http://127.0.0.1:5030/api/v1/db")).toMatchObject({
      ok: false,
      error: expect.stringContaining("路径"),
    });
    expect(validateChatlogServiceBaseUrl("http://127.0.0.1:5030?token=raw-secret")).toMatchObject({
      ok: false,
      error: expect.stringContaining("路径"),
    });
  });

  it("builds API URLs from the active service origin only", () => {
    expect(buildChatlogApiUrl("/api/v1/db", "http://127.0.0.1:6041")).toBe(
      "http://127.0.0.1:6041/api/v1/db",
    );
    expect(buildChatlogApiUrl("api/v1/search", "127.0.0.1:6041")).toBe(
      "http://127.0.0.1:6041/api/v1/search",
    );
  });

  it("formats a privacy-safe service label without path or query", () => {
    expect(formatChatlogServiceLabel("http://127.0.0.1:6041")).toBe(
      "本机服务 127.0.0.1:6041",
    );
    expect(formatChatlogServiceLabel("http://localhost:5030")).toBe(
      "本机服务 localhost:5030",
    );
  });
});
