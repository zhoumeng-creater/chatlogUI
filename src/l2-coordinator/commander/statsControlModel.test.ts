import { describe, expect, it } from "vitest";
import {
  buildStatsControlViewModel,
  resolvePreviousPeriodRequest,
  resolveStatsRequest,
  resolveTrendRequest,
  type StatsControlState,
} from "./statsControlModel";

const baseControl: StatsControlState = {
  timePreset: "7d",
  granularity: "day",
  objectFilter: "all",
  comparisonMode: "off",
};

describe("statsControlModel", () => {
  it("maps supported presets into stats and trend requests", () => {
    expect(resolveStatsRequest({
      chat: "session_synthetic_001",
      control: { ...baseControl, timePreset: "30d" },
    })).toEqual({
      chat: "session_synthetic_001",
      time: "last-30d",
    });

    expect(resolveTrendRequest({
      chat: "session_synthetic_001",
      control: { ...baseControl, timePreset: "90d" },
    })).toEqual({
      supported: true,
      params: { chat: "session_synthetic_001", window: "90d", summary: false },
      warning: null,
    });
  });

  it("validates custom ranges and keeps unsupported custom trend explicit", () => {
    const control: StatsControlState = {
      ...baseControl,
      timePreset: "custom",
      customStart: "2026-01-10",
      customEnd: "2026-01-03",
    };

    const model = buildStatsControlViewModel({ control, hasTrendData: true });

    expect(model.customRangeError).toBe("结束日期不能早于开始日期。");
    expect(resolveStatsRequest({ chat: "session_synthetic_001", control })).toEqual({
      chat: "session_synthetic_001",
    });
    expect(resolveTrendRequest({ chat: "session_synthetic_001", control })).toMatchObject({
      supported: false,
      reason: "自定义时间趋势暂不可用，请先查看概览统计或切回预设时间。",
    });
  });

  it("calculates previous-period requests for finite presets", () => {
    expect(resolvePreviousPeriodRequest({
      chat: "session_synthetic_001",
      control: { ...baseControl, timePreset: "7d", comparisonMode: "previousPeriod" },
      referenceDate: new Date("2026-06-14T12:00:00.000Z"),
    })).toEqual({
      supported: true,
      params: {
        chat: "session_synthetic_001",
        since: 1_780_185_600,
        until: 1_780_790_400,
      },
      rangeLabel: "上一周期",
      reason: null,
    });
  });

  it("keeps object filters visible but disabled until the backend contract exists", () => {
    const model = buildStatsControlViewModel({
      control: { ...baseControl, objectFilter: "all" },
      hasTrendData: true,
    });

    expect(model.objectOptions.map((option) => [option.value, option.disabled, option.disabledReason])).toEqual([
      ["all", false, null],
      ["me", true, "本机统计接口暂不支持按发送方筛选。"],
      ["other", true, "本机统计接口暂不支持按发送方筛选。"],
      ["selectedMember", true, "本机统计接口暂不支持指定成员统计。"],
    ]);
    expect(model.exportScopeSummary).toContain("近 7 天");
    expect(model.exportScopeSummary).toContain("按日");
  });
});
