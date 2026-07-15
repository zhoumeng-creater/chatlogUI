import { describe, expect, it } from "vitest";
import {
  createSearchDateShortcut,
  toInclusiveEpochRange,
  validateSearchDateRange,
} from "./searchDateRange";

describe("searchDateRange", () => {
  it("converts local natural days to inclusive epoch boundaries", () => {
    const result = toInclusiveEpochRange(
      { start: "2026-07-14", end: "2026-07-14" },
      "Asia/Shanghai",
    );
    expect(result).toEqual({
      since: Date.UTC(2026, 6, 13, 16) / 1000,
      until: Date.UTC(2026, 6, 14, 16) / 1000 - 1,
    });
  });

  it("uses calendar midnights across DST spring and fall instead of adding 24 hours", () => {
    const spring = toInclusiveEpochRange(
      { start: "2026-03-08", end: "2026-03-08" },
      "America/New_York",
    );
    const fall = toInclusiveEpochRange(
      { start: "2026-11-01", end: "2026-11-01" },
      "America/New_York",
    );
    expect((spring.until! + 1) - spring.since!).toBe(23 * 60 * 60);
    expect((fall.until! + 1) - fall.since!).toBe(25 * 60 * 60);
  });

  it("uses the first real instant of a natural day when midnight is skipped", () => {
    const havanaMidnightGap = toInclusiveEpochRange(
      { start: "2026-03-08", end: "2026-03-08" },
      "America/Havana",
    );

    expect(havanaMidnightGap).toEqual({
      // Havana advances directly from 23:59:59 to 01:00:00 on this date.
      since: Date.UTC(2026, 2, 8, 5) / 1000,
      until: Date.UTC(2026, 2, 9, 4) / 1000 - 1,
    });
    expect((havanaMidnightGap.until! + 1) - havanaMidnightGap.since!).toBe(23 * 60 * 60);
  });

  it("supports one-sided ranges and leap day while rejecting impossible or reversed days", () => {
    expect(toInclusiveEpochRange({ start: "2024-02-29" }, "Asia/Shanghai")).toEqual({
      since: Date.UTC(2024, 1, 28, 16) / 1000,
    });
    expect(toInclusiveEpochRange({ end: "2024-02-29" }, "Asia/Shanghai")).toEqual({
      until: Date.UTC(2024, 1, 29, 16) / 1000 - 1,
    });
    expect(validateSearchDateRange({ start: "2026-02-30" })).toMatchObject({
      valid: false,
      startError: "请输入有效日期",
    });
    expect(validateSearchDateRange({ start: "2026-07-15", end: "2026-07-14" })).toMatchObject({
      valid: false,
      rangeError: "开始日期不能晚于结束日期",
    });
    expect(validateSearchDateRange({ end: "9999-12-31" })).toMatchObject({
      valid: false,
      endError: "请输入有效日期",
    });
    expect(() => toInclusiveEpochRange({ end: "9999-12-31" }, "Asia/Shanghai"))
      .toThrowError("Search date range is invalid");
  });

  it("creates the four confirmed shortcuts by local calendar arithmetic", () => {
    const now = new Date(2026, 6, 14, 23, 30);
    expect(createSearchDateShortcut("today", now)).toEqual({ start: "2026-07-14", end: "2026-07-14" });
    expect(createSearchDateShortcut("last7", now)).toEqual({ start: "2026-07-08", end: "2026-07-14" });
    expect(createSearchDateShortcut("last30", now)).toEqual({ start: "2026-06-15", end: "2026-07-14" });
    expect(createSearchDateShortcut("monthToDate", now)).toEqual({ start: "2026-07-01", end: "2026-07-14" });
  });
});
