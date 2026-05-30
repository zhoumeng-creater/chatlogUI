import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "./readiness";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readiness fetchers", () => {
  it("accepts bare host:port service addresses from chatlog config summaries", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }),
    );

    await expect(fetchHealth("127.0.0.1:5030")).resolves.toBe(true);
    expect(capturedUrl).toBe("http://127.0.0.1:5030/health?format=json");
  });
});
