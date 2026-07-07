import { describe, expect, it } from "vitest";
import { isTransientSelectionStatus } from "./selectionStatusModel";

describe("selectionStatusModel", () => {
  it("treats successful copy, jump, and filter feedback as transient", () => {
    expect(isTransientSelectionStatus("已复制消息内容。")).toBe(true);
    expect(isTransientSelectionStatus("已定位到 2026-07-07 12:29 附近。")).toBe(true);
    expect(isTransientSelectionStatus("已按范围选择 12 条已加载消息。")).toBe(true);
    expect(isTransientSelectionStatus("已跳转到 2026-07-07，加载 8 条附近消息。")).toBe(true);
  });

  it("keeps failures and unsupported-operation feedback visible", () => {
    expect(isTransientSelectionStatus("复制失败，请检查剪贴板权限。")).toBe(false);
    expect(isTransientSelectionStatus("当前后端暂不支持同类消息搜索。")).toBe(false);
    expect(isTransientSelectionStatus("当前已加载消息中没有符合范围的消息。")).toBe(false);
    expect(isTransientSelectionStatus(null)).toBe(false);
  });
});
