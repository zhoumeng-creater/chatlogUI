import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  IntegratedDateRangeInput,
  applyDateDeletion,
  applyCalendarRangeSelection,
  moveCalendarFocus,
  normalizeDateText,
  resolveCalendarAnchorDay,
  resolveCalendarMonthShift,
  splitPastedDateRange,
} from "./IntegratedDateRangeInput";

describe("IntegratedDateRangeInput", () => {
  it("normalizes continuous digits and common pasted separators without inventing a date", () => {
    expect(normalizeDateText("20260102")).toBe("2026-01-02");
    expect(normalizeDateText("2026/01/02")).toBe("2026-01-02");
    expect(normalizeDateText("2026-1")).toBe("2026-1");
    expect(normalizeDateText("2026-7-11")).toBe("2026-7-11");
    expect(normalizeDateText("2026-07-1")).toBe("2026-07-1");
    expect(normalizeDateText("2026 年 01 月 02 日 extra")).toBe("2026-01-02");
    expect(splitPastedDateRange("2026010220260131")).toEqual({
      start: "2026-01-02",
      end: "2026-01-31",
    });
    expect(splitPastedDateRange("20260102")).toBeNull();
  });

  it("deletes date digits without collapsing fixed separators or corrupting later slots", () => {
    const first = applyDateDeletion("2026-07-11", 6, 6, "Backspace");
    expect(first).toEqual({ value: "2026-7-11", caret: 5 });
    expect(applyDateDeletion(first!.value, first!.caret, first!.caret, "Backspace"))
      .toEqual({ value: "202-7-11", caret: 3 });
    expect(applyDateDeletion("2026-07-11", 5, 5, "Delete"))
      .toEqual({ value: "2026-7-11", caret: 5 });
  });

  it("orders two calendar selections and starts a new range after a completed range", () => {
    expect(applyCalendarRangeSelection({}, "2026-07-14")).toEqual({
      start: "2026-07-14",
    });
    expect(
      applyCalendarRangeSelection({ start: "2026-07-14" }, "2026-07-10"),
    ).toEqual({ start: "2026-07-10", end: "2026-07-14" });
    expect(
      applyCalendarRangeSelection(
        { start: "2026-07-10", end: "2026-07-14" },
        "2026-08-01",
      ),
    ).toEqual({ start: "2026-08-01" });
    expect(applyCalendarRangeSelection({ start: "2026-07" }, "2026-08-01")).toEqual({
      start: "2026-08-01",
    });
    expect(applyCalendarRangeSelection({ start: "2026-02-31" }, "2026-08-01")).toEqual({
      start: "2026-08-01",
    });
  });

  it("moves the calendar focus with arrows, week boundaries, and month keys", () => {
    const day = new Date(2026, 6, 14);
    expect(moveCalendarFocus(day, "ArrowLeft")).toEqual(new Date(2026, 6, 13));
    expect(moveCalendarFocus(day, "ArrowDown")).toEqual(new Date(2026, 6, 21));
    expect(moveCalendarFocus(day, "Home")).toEqual(new Date(2026, 6, 12));
    expect(moveCalendarFocus(day, "End")).toEqual(new Date(2026, 6, 18));
    expect(moveCalendarFocus(day, "PageDown")).toEqual(new Date(2026, 7, 14));
    expect(resolveCalendarMonthShift(new Date(2026, 0, 31), new Date(2026, 0, 1), 1)).toEqual({
      focusedDay: new Date(2026, 1, 28),
      visibleMonth: new Date(2026, 1, 1),
    });
    expect(resolveCalendarAnchorDay({ start: "2027-03-05" }, new Date(2026, 6, 14))).toEqual(
      new Date(2027, 2, 5),
    );
  });

  it("keeps invalid typing quiet until field commitment and renders an accessible calendar", () => {
    const invalidHtml = renderToStaticMarkup(
      <IntegratedDateRangeInput
        value={{ start: "2026-02-31", end: "2026-02-01" }}
        onChange={vi.fn()}
        onShortcut={vi.fn()}
      />,
    );
    expect(invalidHtml.match(/<input/g)).toHaveLength(2);
    expect(invalidHtml).toContain('aria-label="开始日期"');
    expect(invalidHtml).toContain('aria-label="结束日期"');
    expect(invalidHtml.match(/data-date-segment=/g)).toHaveLength(6);
    expect(invalidHtml).toContain("当前日期输入尚未完成");
    expect(invalidHtml).not.toContain('aria-invalid="true"');
    expect(invalidHtml).not.toContain("请输入有效日期");

    const openHtml = renderToStaticMarkup(
      <IntegratedDateRangeInput
        value={{}}
        onChange={vi.fn()}
        onShortcut={vi.fn()}
        open
        now={new Date(2026, 6, 14, 12)}
      />,
    );
    expect(openHtml).toContain('role="dialog"');
    expect(openHtml).toContain('aria-label="选择日期范围"');
    expect(openHtml).toContain("今天");
    expect(openHtml).toContain("近 7 天");
    expect(openHtml).toContain("近 30 天");
    expect(openHtml).toContain("本月至今");
    expect(openHtml).toContain('role="grid"');
    expect(openHtml).toContain('aria-label="2026年7月14日"');
  });
});
