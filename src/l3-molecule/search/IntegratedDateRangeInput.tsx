import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import type {
  SearchDateRange,
  SearchDateShortcut,
} from "@l2/commander/searchDateRange";
import { classNames } from "@/utils/classNames";

interface IntegratedDateRangeInputProps {
  value: SearchDateRange;
  onChange: (value: SearchDateRange) => void;
  errors?: { startError?: string; endError?: string; rangeError?: string };
  onShortcut: (shortcut: SearchDateShortcut) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, trigger?: HTMLButtonElement) => void;
  now?: Date;
  className?: string;
}

const SHORTCUTS: Array<{ id: SearchDateShortcut; label: string }> = [
  { id: "today", label: "今天" },
  { id: "last7", label: "近 7 天" },
  { id: "last30", label: "近 30 天" },
  { id: "monthToDate", label: "本月至今" },
];

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"] as const;

export function normalizeDateText(raw: string): string {
  const groups = Array.from(raw.matchAll(/\d+/gu), (match) => match[0]);
  const digits = groups.join("").slice(0, 8);
  if (groups.length > 1 && groups[0].length <= 4) {
    const year = groups[0].slice(0, 4);
    const month = (groups[1] ?? "").slice(0, 2);
    const overflowDay = groups[1]?.slice(2, 4) ?? "";
    const day = (groups[2] ?? overflowDay).slice(0, 2);
    if (day) return `${year}-${month}-${day}`;
    if (month) return `${year}-${month}`;
    return year;
  }
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function applyDateDeletion(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  key: "Backspace" | "Delete",
): { value: string; caret: number } | null {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  if (end > start) {
    const next = normalizeDateText(`${value.slice(0, start)}${value.slice(end)}`);
    return { value: next, caret: Math.min(start, next.length) };
  }

  let digitIndex = key === "Backspace" ? start - 1 : start;
  const step = key === "Backspace" ? -1 : 1;
  while (digitIndex >= 0 && digitIndex < value.length && !/\d/u.test(value[digitIndex])) {
    digitIndex += step;
  }
  if (digitIndex < 0 || digitIndex >= value.length) return null;
  const next = normalizeDateText(`${value.slice(0, digitIndex)}${value.slice(digitIndex + 1)}`);
  return { value: next, caret: Math.min(digitIndex, next.length) };
}

export function splitPastedDateRange(raw: string): Required<SearchDateRange> | null {
  const digits = Array.from(raw.matchAll(/\d/gu), (match) => match[0]).join("");
  if (digits.length < 16) return null;
  return {
    start: normalizeDateText(digits.slice(0, 8)),
    end: normalizeDateText(digits.slice(8, 16)),
  };
}

export function applyCalendarRangeSelection(
  value: SearchDateRange,
  selectedDay: string,
): SearchDateRange {
  if (!value.start || !parseCanonicalDay(value.start) || value.end) {
    return { start: selectedDay };
  }
  return selectedDay < value.start
    ? { start: selectedDay, end: value.start }
    : { start: value.start, end: selectedDay };
}

export function moveCalendarFocus(value: Date, key: string): Date {
  const next = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (key === "ArrowLeft") next.setDate(next.getDate() - 1);
  if (key === "ArrowRight") next.setDate(next.getDate() + 1);
  if (key === "ArrowUp") next.setDate(next.getDate() - 7);
  if (key === "ArrowDown") next.setDate(next.getDate() + 7);
  if (key === "Home") next.setDate(next.getDate() - next.getDay());
  if (key === "End") next.setDate(next.getDate() + (6 - next.getDay()));
  if (key === "PageUp" || key === "PageDown") {
    const direction = key === "PageUp" ? -1 : 1;
    const originalDay = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + direction);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDay));
  }
  return next;
}

export function resolveCalendarAnchorDay(value: SearchDateRange, now: Date): Date {
  return parseCanonicalDay(value.start ?? value.end ?? "") ?? localMidnight(now);
}

export function resolveCalendarMonthShift(
  focusedDay: Date,
  visibleMonth: Date,
  amount: number,
): { focusedDay: Date; visibleMonth: Date } {
  const nextMonth = addMonths(visibleMonth, amount);
  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  return {
    focusedDay: new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      Math.min(focusedDay.getDate(), lastDay),
    ),
    visibleMonth: nextMonth,
  };
}

export function IntegratedDateRangeInput({
  value,
  onChange,
  errors = {},
  onShortcut,
  disabled = false,
  open,
  onOpenChange,
  now = new Date(),
  className,
}: IntegratedDateRangeInputProps) {
  const rootId = useId();
  const startErrorId = `${rootId}-start-error`;
  const endErrorId = `${rootId}-end-error`;
  const rangeErrorId = `${rootId}-range-error`;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [revealedErrors, setRevealedErrors] = useState({
    start: false,
    end: false,
    range: false,
  });
  const resolvedOpen = open ?? uncontrolledOpen;
  const calendarButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyOpenRef = useRef(resolvedOpen);
  const initialDay = resolveCalendarAnchorDay(value, now);
  const initialDayKey = formatLocalDay(initialDay);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(initialDay));
  const [focusedDay, setFocusedDay] = useState(initialDay);
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const initialRangeKeyRef = useRef(`${value.start ?? ""}\u0000${value.end ?? ""}`);
  const [rangeAnnouncement, setRangeAnnouncement] = useState("");

  const visibleStartError = revealedErrors.start ? errors.startError : undefined;
  const visibleEndError = revealedErrors.end ? errors.endError : undefined;
  const visibleRangeError = revealedErrors.range ? errors.rangeError : undefined;

  const beginEditing = (field: "start" | "end") => {
    setRevealedErrors((current) => ({ ...current, [field]: false, range: false }));
  };
  const revealValidation = (field: "start" | "end") => {
    setRevealedErrors((current) => ({ ...current, [field]: true, range: true }));
  };

  const setOpen = (next: boolean, trigger?: HTMLButtonElement) => {
    if (open === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next, trigger);
  };

  useEffect(() => {
    if (previouslyOpenRef.current && !resolvedOpen) {
      calendarButtonRef.current?.focus();
    }
    previouslyOpenRef.current = resolvedOpen;
  }, [resolvedOpen]);

  useEffect(() => {
    const next = parseCanonicalDay(initialDayKey);
    if (!next) return;
    setVisibleMonth(monthStart(next));
    setFocusedDay(next);
  }, [initialDayKey]);

  useEffect(() => {
    if (!resolvedOpen) return;
    const key = formatLocalDay(focusedDay);
    dayButtonRefs.current.get(key)?.focus();
  }, [focusedDay, resolvedOpen, visibleMonth]);

  useEffect(() => {
    const nextKey = `${value.start ?? ""}\u0000${value.end ?? ""}`;
    if (nextKey === initialRangeKeyRef.current) return;
    initialRangeKeyRef.current = nextKey;
    setRangeAnnouncement(describeDateRangeForSpeech(value).replace(/^当前/u, "日期"));
  }, [value]);

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const range = splitPastedDateRange(event.clipboardData.getData("text"));
    if (!range) return;
    event.preventDefault();
    onChange(range);
  };

  const selectCalendarDay = (day: Date) => {
    const next = applyCalendarRangeSelection(value, formatLocalDay(day));
    onChange(next);
    if (next.end) setOpen(false);
  };

  const handleDateKeyDown = (
    field: "start" | "end",
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      revealValidation(field);
      return;
    }
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    const input = event.currentTarget;
    const edit = applyDateDeletion(
      input.value,
      input.selectionStart ?? input.value.length,
      input.selectionEnd ?? input.value.length,
      event.key,
    );
    if (!edit) return;
    event.preventDefault();
    beginEditing(field);
    onChange({ ...value, [field]: edit.value || undefined });
    const restoreCaret = () => {
      if (document.activeElement === input) input.setSelectionRange(edit.caret, edit.caret);
    };
    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(restoreCaret);
    } else {
      queueMicrotask(restoreCaret);
    }
  };

  const calendarDays = createCalendarDays(visibleMonth);

  return (
    <div className={classNames("search-date-range", className)}>
      <div className="search-date-range__fields">
        <label className="search-date-range__field">
          <span className="search-date-range__field-label">开始</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            aria-label="开始日期"
            aria-invalid={Boolean(visibleStartError || visibleRangeError) || undefined}
            aria-describedby={
              visibleStartError ? startErrorId : visibleRangeError ? rangeErrorId : undefined
            }
            placeholder="YYYY-MM-DD"
            value={value.start ?? ""}
            disabled={disabled}
            onPaste={handlePaste}
            onChange={(event) => {
              beginEditing("start");
              onChange({
                ...value,
                start: normalizeDateText(event.currentTarget.value) || undefined,
              });
            }}
            onBlur={() => revealValidation("start")}
            onKeyDown={(event) => handleDateKeyDown("start", event)}
          />
          <span className="search-date-range__segments" aria-hidden="true">
            <span data-date-segment="year" />
            <span data-date-segment="month" />
            <span data-date-segment="day" />
          </span>
        </label>
        <span className="search-date-range__separator" aria-hidden="true">
          至
        </span>
        <label className="search-date-range__field">
          <span className="search-date-range__field-label">结束</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            aria-label="结束日期"
            aria-invalid={Boolean(visibleEndError || visibleRangeError) || undefined}
            aria-describedby={
              visibleEndError ? endErrorId : visibleRangeError ? rangeErrorId : undefined
            }
            placeholder="YYYY-MM-DD"
            value={value.end ?? ""}
            disabled={disabled}
            onPaste={handlePaste}
            onChange={(event) => {
              beginEditing("end");
              onChange({
                ...value,
                end: normalizeDateText(event.currentTarget.value) || undefined,
              });
            }}
            onBlur={() => revealValidation("end")}
            onKeyDown={(event) => handleDateKeyDown("end", event)}
          />
          <span className="search-date-range__segments" aria-hidden="true">
            <span data-date-segment="year" />
            <span data-date-segment="month" />
            <span data-date-segment="day" />
          </span>
        </label>
        <button
          ref={calendarButtonRef}
          type="button"
          className="search-date-range__calendar-trigger"
          aria-label={`打开日期范围选择器，${describeDateRangeForSpeech(value)}`}
          aria-haspopup="dialog"
          aria-expanded={resolvedOpen}
          disabled={disabled}
          onClick={(event) => setOpen(!resolvedOpen, event.currentTarget)}
        >
          <CalendarDays size={17} aria-hidden="true" />
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {rangeAnnouncement}
      </span>

      {visibleStartError && (
        <p id={startErrorId} className="search-date-range__error">
          开始日期：{visibleStartError}
        </p>
      )}
      {visibleEndError && (
        <p id={endErrorId} className="search-date-range__error">
          结束日期：{visibleEndError}
        </p>
      )}
      {visibleRangeError && (
        <p id={rangeErrorId} className="search-date-range__error">
          {visibleRangeError}
        </p>
      )}

      {resolvedOpen && (
        <div
          role="dialog"
          aria-label="选择日期范围"
          className="search-date-range__popover"
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }}
        >
          <div className="search-date-range__popover-header">
            <button
              type="button"
              aria-label="上个月"
              onClick={() => {
                const next = resolveCalendarMonthShift(focusedDay, visibleMonth, -1);
                setVisibleMonth(next.visibleMonth);
                setFocusedDay(next.focusedDay);
              }}
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <strong aria-live="polite">
              {visibleMonth.getFullYear()} 年 {visibleMonth.getMonth() + 1} 月
            </strong>
            <button
              type="button"
              aria-label="下个月"
              onClick={() => {
                const next = resolveCalendarMonthShift(focusedDay, visibleMonth, 1);
                setVisibleMonth(next.visibleMonth);
                setFocusedDay(next.focusedDay);
              }}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
            <button type="button" aria-label="关闭日期选择器" onClick={() => setOpen(false)}>
              <X size={17} aria-hidden="true" />
            </button>
          </div>

          <div className="search-date-range__shortcuts" aria-label="快捷日期范围">
            {SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => {
                  onShortcut(shortcut.id);
                  setOpen(false);
                }}
              >
                {shortcut.label}
              </button>
            ))}
            {(value.start || value.end) && (
              <button
                type="button"
                onClick={() => {
                  onChange({});
                  setOpen(false);
                }}
              >
                清除日期
              </button>
            )}
          </div>

          <div role="grid" aria-label={`${visibleMonth.getFullYear()}年${visibleMonth.getMonth() + 1}月`}>
            <div role="row" className="search-date-range__weekdays">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} role="columnheader" aria-label={`星期${weekday}`}>
                  {weekday}
                </span>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, weekIndex) => (
              <div role="row" key={weekIndex} className="search-date-range__week">
                {calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
                  const dayKey = formatLocalDay(day);
                  const inMonth = day.getMonth() === visibleMonth.getMonth();
                  const selected = dayKey === value.start || dayKey === value.end;
                  const inRange = Boolean(
                    value.start && value.end && dayKey >= value.start && dayKey <= value.end,
                  );
                  return (
                    <span
                      role="gridcell"
                      aria-selected={selected}
                      key={dayKey}
                      className={classNames(
                        "search-date-range__day-cell",
                        inRange && "search-date-range__day-cell--in-range",
                      )}
                    >
                      <button
                        ref={(node) => {
                          if (node) dayButtonRefs.current.set(dayKey, node);
                          else dayButtonRefs.current.delete(dayKey);
                        }}
                        type="button"
                        tabIndex={dayKey === formatLocalDay(focusedDay) ? 0 : -1}
                        aria-label={`${day.getFullYear()}年${day.getMonth() + 1}月${day.getDate()}日`}
                        aria-pressed={selected}
                        className={classNames(
                          "search-date-range__day",
                          !inMonth && "search-date-range__day--outside",
                          selected && "search-date-range__day--selected",
                        )}
                        onClick={() => selectCalendarDay(day)}
                        onFocus={() => setFocusedDay(day)}
                        onKeyDown={(event) => {
                          if (
                            ![
                              "ArrowLeft",
                              "ArrowRight",
                              "ArrowUp",
                              "ArrowDown",
                              "Home",
                              "End",
                              "PageUp",
                              "PageDown",
                            ].includes(event.key)
                          ) {
                            return;
                          }
                          event.preventDefault();
                          const next = moveCalendarFocus(day, event.key);
                          setFocusedDay(next);
                          setVisibleMonth(monthStart(next));
                        }}
                      >
                        {day.getDate()}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function describeDateRangeForSpeech(value: SearchDateRange): string {
  if (!value.start && !value.end) return "当前未设置日期范围";
  const start = value.start ? parseCanonicalDay(value.start) : null;
  const end = value.end ? parseCanonicalDay(value.end) : null;
  if (start && end) return `当前范围 ${formatSpokenDay(start)} 至 ${formatSpokenDay(end)}`;
  if (start && !value.end) return `当前开始日期 ${formatSpokenDay(start)}，结束日期未设置`;
  if (!value.start && end) return `当前结束日期 ${formatSpokenDay(end)}，开始日期未设置`;
  return "当前日期输入尚未完成";
}

function formatSpokenDay(value: Date): string {
  return `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日`;
}

function localMidnight(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatLocalDay(value: Date): string {
  return [
    String(value.getFullYear()).padStart(4, "0"),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function parseCanonicalDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return formatLocalDay(parsed) === value ? parsed : null;
}

function createCalendarDays(month: Date): Date[] {
  const first = monthStart(month);
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - cursor.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + index);
    return day;
  });
}
