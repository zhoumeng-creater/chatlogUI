import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSearchDateShortcut,
  toInclusiveEpochRange,
  validateSearchDateRange,
} from "./searchDateRange";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("searchDateRange", () => {
  it("converts local natural days to inclusive epoch boundaries", () => {
    vi.stubEnv("TZ", "Asia/Shanghai");
    const result = toInclusiveEpochRange({ start: "2026-07-14", end: "2026-07-14" });
    expect(result).toEqual({
      since: Math.floor(new Date(2026, 6, 14, 0, 0, 0, 0).getTime() / 1000),
      until: Math.floor(new Date(2026, 6, 15, 0, 0, 0, 0).getTime() / 1000) - 1,
    });
  });

  it("uses calendar midnights across DST spring and fall instead of adding 24 hours", () => {
    vi.stubEnv("TZ", "America/New_York");
    const spring = toInclusiveEpochRange({ start: "2026-03-08", end: "2026-03-08" });
    const fall = toInclusiveEpochRange({ start: "2026-11-01", end: "2026-11-01" });
    expect((spring.until! + 1) - spring.since!).toBe(23 * 60 * 60);
    expect((fall.until! + 1) - fall.since!).toBe(25 * 60 * 60);
  });

  it("supports one-sided ranges and leap day while rejecting impossible or reversed days", () => {
    vi.stubEnv("TZ", "Asia/Shanghai");
    expect(toInclusiveEpochRange({ start: "2024-02-29" })).toEqual({
      since: Math.floor(new Date(2024, 1, 29).getTime() / 1000),
    });
    expect(toInclusiveEpochRange({ end: "2024-02-29" })).toEqual({
      until: Math.floor(new Date(2024, 2, 1).getTime() / 1000) - 1,
    });
    expect(validateSearchDateRange({ start: "2026-02-30" })).toMatchObject({
      valid: false,
      startError: "请输入有效日期",
    });
    expect(validateSearchDateRange({ start: "2026-07-15", end: "2026-07-14" })).toMatchObject({
      valid: false,
      rangeError: "开始日期不能晚于结束日期",
    });
  });

  it("creates the four confirmed shortcuts by local calendar arithmetic", () => {
    vi.stubEnv("TZ", "Asia/Shanghai");
    const now = new Date(2026, 6, 14, 23, 30);
    expect(createSearchDateShortcut("today", now)).toEqual({ start: "2026-07-14", end: "2026-07-14" });
    expect(createSearchDateShortcut("last7", now)).toEqual({ start: "2026-07-08", end: "2026-07-14" });
    expect(createSearchDateShortcut("last30", now)).toEqual({ start: "2026-06-15", end: "2026-07-14" });
    expect(createSearchDateShortcut("monthToDate", now)).toEqual({ start: "2026-07-01", end: "2026-07-14" });
  });
});
