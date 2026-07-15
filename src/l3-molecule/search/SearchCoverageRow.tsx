import { useState, type RefCallback } from "react";
import {
  getSearchRangeLoadCount,
  selectNearestSearchGap,
  type SearchLoadedRange,
  type SearchWindowOperationStatus,
} from "@l2/commander/searchResultWindowModel";

export interface SearchCoverageGap {
  range: SearchLoadedRange;
  operation: SearchWindowOperationStatus;
  loadAvailable: boolean;
  errorMessage?: string;
}

type GapProps = {
  mode: "gap";
  range: SearchLoadedRange;
  operation: SearchWindowOperationStatus;
  stale: boolean;
  loadAvailable?: boolean;
  errorMessage?: string;
  elementRef?: RefCallback<HTMLDivElement>;
  onLoad: () => void;
  onCancel: () => void;
  containedByListItem?: boolean;
};

type CoverageProps = {
  mode: "coverage";
  loadedRanges: SearchLoadedRange[];
  gaps: SearchCoverageGap[];
  totalCount: number;
  activeSourceIndex: number | null;
  stale: boolean;
  onLoad: (range: SearchLoadedRange) => void;
  onCancel: (range: SearchLoadedRange) => void;
  containedByListItem?: boolean;
};

type SearchCoverageRowProps = GapProps | CoverageProps;

export function SearchCoverageRow(props: SearchCoverageRowProps) {
  if (props.mode === "coverage") {
    const ranges = normalizeRanges(props.loadedRanges);
    const unloadedCount = props.gaps.reduce(
      (total, gap) => total + gap.range.end - gap.range.start,
      0,
    );
    const actionableGaps = props.gaps.filter((gap) => gap.loadAvailable);
    const nearestRange = selectNearestSearchGap(
      actionableGaps.map((gap) => gap.range),
      props.activeSourceIndex,
    );
    const nearestGap = nearestRange
      ? actionableGaps.find((gap) => sameRange(gap.range, nearestRange)) ?? null
      : null;
    const otherGaps = nearestGap
      ? props.gaps.filter((gap) => !sameRange(gap.range, nearestGap.range))
      : [];

    return (
      <div className="search-coverage-summary">
        <span>{formatLoadedRanges(ranges)}</span>
        <span>
          {props.gaps.length.toLocaleString()} 个缺口，共 {unloadedCount.toLocaleString()} 条未加载
        </span>
        {nearestGap ? (
          <GapAction
            gap={nearestGap}
            stale={props.stale}
            onLoad={() => props.onLoad(nearestGap.range)}
            onCancel={() => props.onCancel(nearestGap.range)}
          />
        ) : (
          <span role="status" aria-live="polite">
            {props.stale
              ? "数据已更新，请先刷新后补载缺口。"
              : "当前缺口暂时没有可用加载位置。"}
          </span>
        )}
        {otherGaps.length > 0 && (
          <details className="search-coverage-summary__other-gaps">
            <summary>选择其他缺口</summary>
            <ul>
              {otherGaps.map((gap) => (
                <li key={rangeKey(gap.range)}>
                  <span>
                    {formatRange(gap.range)} · {(gap.range.end - gap.range.start).toLocaleString()} 条未加载
                  </span>
                  <GapAction
                    gap={gap}
                    stale={props.stale}
                    onLoad={() => props.onLoad(gap.range)}
                    onCancel={() => props.onCancel(gap.range)}
                  />
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  const gap: SearchCoverageGap = {
    range: props.range,
    operation: props.operation,
    loadAvailable: props.loadAvailable ?? true,
    errorMessage: props.errorMessage,
  };
  return (
    <div
      ref={props.elementRef}
      className="search-coverage-gap"
      role={props.containedByListItem ? undefined : "listitem"}
      data-gap-start={props.range.start}
      data-gap-end={props.range.end}
    >
      <span>{formatRange(props.range)}尚未加载</span>
      <GapAction
        gap={gap}
        stale={props.stale}
        onLoad={props.onLoad}
        onCancel={props.onCancel}
      />
    </div>
  );
}

function GapAction({
  gap,
  stale,
  onLoad,
  onCancel,
}: {
  gap: SearchCoverageGap;
  stale: boolean;
  onLoad: () => void;
  onCancel: () => void;
}) {
  const [cancelAnnounced, setCancelAnnounced] = useState(false);
  const loading = gap.operation.status === "loading";
  const loadCount = getSearchRangeLoadCount(gap.range);
  const countLabel = formatLoadCount(gap.range);
  const statusMessage = cancelAnnounced && gap.operation.status === "idle"
    ? `已取消加载${formatRange(gap.range)}中的${countLabel}。`
    : loading
      ? `正在加载${formatRange(gap.range)}中的${countLabel}；可以取消。`
      : gap.operation.status === "error"
        ? `${gap.errorMessage ?? "这个缺口加载失败。"} 可以重试${countLabel}。`
        : `默认补载距离当前结果最近的缺口，单次最多 ${loadCount.toLocaleString()} 条。`;

  if (!loading && (stale || !gap.loadAvailable)) {
    return (
      <span role="status" aria-live="polite" aria-atomic="true">
        {stale
          ? "数据已更新，请先刷新后补载这个缺口。"
          : "当前缺口暂时没有可用加载位置。"}
      </span>
    );
  }

  const actionLabel = loading
    ? `取消加载${countLabel}`
    : gap.operation.status === "error"
      ? `重试加载${countLabel}`
      : `加载${countLabel}`;
  const announceStatus = cancelAnnounced || gap.operation.status !== "idle";
  return (
    <>
      {announceStatus ? (
        <span role="status" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </span>
      ) : (
        <span>{statusMessage}</span>
      )}
      <button
        type="button"
        aria-busy={loading || undefined}
        onClick={() => {
          if (loading) {
            setCancelAnnounced(true);
            onCancel();
            return;
          }
          setCancelAnnounced(false);
          onLoad();
        }}
      >
        {actionLabel}
      </button>
    </>
  );
}

function formatLoadCount(range: SearchLoadedRange): string {
  const remaining = range.end - range.start;
  return remaining < 50
    ? `剩余 ${remaining.toLocaleString()} 条`
    : "相邻 50 条";
}

function formatRange(range: SearchLoadedRange): string {
  return `第 ${(range.start + 1).toLocaleString()}–${range.end.toLocaleString()} 条`;
}

function formatLoadedRanges(ranges: SearchLoadedRange[]): string {
  return ranges.length > 0
    ? `已加载第 ${ranges
        .map((range) => `${(range.start + 1).toLocaleString()}–${range.end.toLocaleString()}`)
        .join("、")} 条`
    : "尚未加载任何结果";
}

function sameRange(left: SearchLoadedRange, right: SearchLoadedRange): boolean {
  return left.start === right.start && left.end === right.end;
}

function rangeKey(range: SearchLoadedRange): string {
  return `${range.start}:${range.end}`;
}

function normalizeRanges(ranges: SearchLoadedRange[]): SearchLoadedRange[] {
  const sorted = ranges
    .filter(
      (range) =>
        Number.isSafeInteger(range.start) &&
        Number.isSafeInteger(range.end) &&
        range.start >= 0 &&
        range.end > range.start,
    )
    .map((range) => ({ ...range }))
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const result: SearchLoadedRange[] = [];
  for (const range of sorted) {
    const previous = result[result.length - 1];
    if (!previous || range.start > previous.end) result.push(range);
    else previous.end = Math.max(previous.end, range.end);
  }
  return result;
}
