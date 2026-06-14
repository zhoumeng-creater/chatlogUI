import { describe, expect, it } from "vitest";
import {
  createAsyncTaskState,
  describeAsyncTaskState,
  isAsyncTaskBusy,
  isAsyncTaskTerminal,
} from "./asyncTaskState";

describe("asyncTaskState", () => {
  it("normalizes cancellable progress with a safe abandonment note", () => {
    const state = createAsyncTaskState({
      status: "progress",
      label: "保存业务导出",
      progress: { completed: 45, total: 100 },
      cancelKind: "stop-waiting",
      safeAbandonmentNote: "可停止等待，后台保存完成后再检查所选位置。",
    });

    expect(state.busy).toBe(true);
    expect(state.terminal).toBe(false);
    expect(state.tone).toBe("info");
    expect(state.progress?.percent).toBe(45);
    expect(state.cancelKind).toBe("stop-waiting");
    expect(state.safeAbandonmentNote).toContain("后台保存");
    expect(describeAsyncTaskState(state)).toContain("保存业务导出进行中，45%");
    expect(isAsyncTaskBusy(state)).toBe(true);
  });

  it("treats partial completion as terminal, retryable, and warning-toned", () => {
    const state = createAsyncTaskState({
      status: "partial",
      label: "媒体导出",
      warnings: ["2 个附件不可用"],
    });

    expect(state.busy).toBe(false);
    expect(state.terminal).toBe(true);
    expect(state.retryable).toBe(true);
    expect(state.tone).toBe("warning");
    expect(state.warnings).toEqual(["2 个附件不可用"]);
    expect(describeAsyncTaskState(state)).toContain("媒体导出部分完成");
    expect(isAsyncTaskTerminal(state)).toBe(true);
  });

  it("keeps cancelled and stale states distinct for user-facing recovery", () => {
    const cancelled = createAsyncTaskState({
      status: "cancelled",
      label: "语义问答",
      cancelKind: "abort",
    });
    const stale = createAsyncTaskState({
      status: "stale",
      label: "搜索结果",
    });

    expect(cancelled.tone).toBe("warning");
    expect(cancelled.terminal).toBe(true);
    expect(cancelled.retryable).toBe(true);
    expect(describeAsyncTaskState(cancelled)).toContain("语义问答已取消");

    expect(stale.tone).toBe("neutral");
    expect(stale.terminal).toBe(true);
    expect(stale.retryable).toBe(false);
    expect(describeAsyncTaskState(stale)).toContain("搜索结果已过期");
  });
});
