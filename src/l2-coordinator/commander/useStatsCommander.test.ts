import { describe, expect, it } from "vitest";
import commanderSource from "./useStatsCommander.ts?raw";

describe("useStatsCommander", () => {
  it("translates stats errors into user-facing reasons before storing them", () => {
    expect(commanderSource).toContain("toApiErrorModel");
    expect(commanderSource).toContain("formatStatsErrorMessage");
    expect(commanderSource).not.toContain('failStatsRequest(requestId, "加载统计失败")');
  });
});
