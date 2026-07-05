import { describe, expect, it } from "vitest";
import { buildDateJumpHistoryRequest, validateDateJumpInput } from "./conversationDateJumpModel";

describe("conversationDateJumpModel", () => {
  it("builds a day-wide history request for the selected chat", () => {
    expect(buildDateJumpHistoryRequest({
      chat: "room_synthetic@chatroom",
      date: "2026-07-05",
      limit: 50,
    })).toEqual({
      chat: "room_synthetic@chatroom",
      limit: 50,
      offset: 0,
      since: 1_783_209_600,
      until: 1_783_295_999,
    });
  });

  it("validates missing and malformed dates with product copy", () => {
    expect(validateDateJumpInput("")).toBe("请选择要跳转的日期。");
    expect(validateDateJumpInput("2026-7-5")).toBe("日期格式无效。");
    expect(validateDateJumpInput("2026-99-99")).toBe("日期格式无效。");
    expect(validateDateJumpInput("2026-07-05")).toBeNull();
  });
});
