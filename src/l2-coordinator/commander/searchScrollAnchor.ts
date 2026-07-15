export const SEARCH_SCROLL_ANCHOR_TOLERANCE_PX = 2;

export interface SearchScrollAnchor {
  resultId: string;
  offsetFromViewportTop: number;
}

export interface SearchScrollCorrection {
  offsetError: number;
  scrollDelta: number;
  nextScrollTop: number;
  aligned: boolean;
}

export function createSearchScrollAnchor({
  resultId,
  resultTop,
  viewportTop,
}: {
  resultId: string;
  resultTop: number;
  viewportTop: number;
}): SearchScrollAnchor | null {
  const normalizedResultId = resultId.trim();
  if (
    !normalizedResultId ||
    !Number.isFinite(resultTop) ||
    !Number.isFinite(viewportTop)
  ) {
    return null;
  }
  return {
    resultId: normalizedResultId,
    offsetFromViewportTop: resultTop - viewportTop,
  };
}

export function cloneSearchScrollAnchor(
  anchor: SearchScrollAnchor | null | undefined,
): SearchScrollAnchor | null {
  if (
    !anchor ||
    !anchor.resultId.trim() ||
    !Number.isFinite(anchor.offsetFromViewportTop)
  ) {
    return null;
  }
  return {
    resultId: anchor.resultId.trim(),
    offsetFromViewportTop: anchor.offsetFromViewportTop,
  };
}

export function resolveSearchAnchorAfterLoad(
  anchor: SearchScrollAnchor | null,
  succeeded: boolean,
): SearchScrollAnchor | null {
  return succeeded ? cloneSearchScrollAnchor(anchor) : null;
}

export function isSearchScrollAnchorAligned(
  currentOffsetFromViewportTop: number,
  targetOffsetFromViewportTop: number,
  tolerance = SEARCH_SCROLL_ANCHOR_TOLERANCE_PX,
): boolean {
  return Number.isFinite(currentOffsetFromViewportTop) &&
    Number.isFinite(targetOffsetFromViewportTop) &&
    Number.isFinite(tolerance) &&
    tolerance >= 0 &&
    Math.abs(currentOffsetFromViewportTop - targetOffsetFromViewportTop) <= tolerance;
}

export function calculateSearchScrollCorrection({
  currentScrollTop,
  currentOffsetFromViewportTop,
  targetOffsetFromViewportTop,
  tolerance = SEARCH_SCROLL_ANCHOR_TOLERANCE_PX,
}: {
  currentScrollTop: number;
  currentOffsetFromViewportTop: number;
  targetOffsetFromViewportTop: number;
  tolerance?: number;
}): SearchScrollCorrection {
  const safeScrollTop = Number.isFinite(currentScrollTop) ? Math.max(0, currentScrollTop) : 0;
  const offsetError = currentOffsetFromViewportTop - targetOffsetFromViewportTop;
  const aligned = isSearchScrollAnchorAligned(
    currentOffsetFromViewportTop,
    targetOffsetFromViewportTop,
    tolerance,
  );
  const nextScrollTop = aligned
    ? safeScrollTop
    : Math.max(0, safeScrollTop + offsetError);
  return {
    offsetError,
    scrollDelta: nextScrollTop - safeScrollTop,
    nextScrollTop,
    aligned,
  };
}
