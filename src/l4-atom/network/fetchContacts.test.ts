import { describe, expect, it } from "vitest";
import { withJsonFormat } from "./httpClient";

describe("fetchContacts url construction", () => {
  it("builds sessions URL with format=json and query params", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/sessions?limit=50&query=test");
    const u = new URL(url);
    expect(u.searchParams.get("format")).toBe("json");
    expect(u.searchParams.get("limit")).toBe("50");
    expect(u.searchParams.get("query")).toBe("test");
  });

  it("builds history URL with chat and offset", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/history?chat=wxid_test&limit=50&offset=0");
    const u = new URL(url);
    expect(u.searchParams.get("format")).toBe("json");
    expect(u.searchParams.get("chat")).toBe("wxid_test");
    expect(u.searchParams.get("limit")).toBe("50");
  });

  it("builds search URL with correct param names", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/search?keyword=hello&chats=wxid_a,room&msg_type=3&limit=20");
    const u = new URL(url);
    expect(u.searchParams.get("keyword")).toBe("hello");
    expect(u.searchParams.get("chats")).toBe("wxid_a,room");
    expect(u.searchParams.get("msg_type")).toBe("3");
  });

  it("builds stats URL with time param", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/stats?chat=wxid_test&time=last-7d");
    const u = new URL(url);
    expect(u.searchParams.get("chat")).toBe("wxid_test");
    expect(u.searchParams.get("time")).toBe("last-7d");
  });

  it("builds dashboard trend URL", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/dashboard/trend?window=7d&summary=0");
    const u = new URL(url);
    expect(u.searchParams.get("window")).toBe("7d");
    expect(u.searchParams.get("summary")).toBe("0");
  });

  it("does not double-add format=json", () => {
    const url = withJsonFormat("http://127.0.0.1:5030/api/v1/db?format=json");
    expect(url).toBe("http://127.0.0.1:5030/api/v1/db?format=json");
  });
});
