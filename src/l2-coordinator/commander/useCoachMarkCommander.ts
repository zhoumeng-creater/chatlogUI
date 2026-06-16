import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useWorkspacePreferenceStore } from "@l2/data-clerk/stores/useWorkspacePreferenceStore";
import {
  buildCoachMarkCandidates,
  selectCoachMark,
  type CoachMarkView,
} from "./coachMarkModel";
import { getShortcutContextId } from "./shortcutCatalog";

interface UseCoachMarkCommanderInput {
  privacyOn: boolean;
  blocking?: boolean;
  overlayOpen?: boolean;
}

export interface CoachMarkCommanderView {
  mark: CoachMarkView | null;
}

export function useCoachMarkCommander({
  privacyOn,
  blocking = false,
  overlayOpen = false,
}: UseCoachMarkCommanderInput) {
  const location = useLocation();
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1366 : window.innerWidth,
  );
  const [anchorRects, setAnchorRects] = useState<Map<string, DOMRectReadOnly>>(() => new Map());
  const [blockingUiOpen, setBlockingUiOpen] = useState(false);
  const preferencesLoaded = useWorkspacePreferenceStore((state) => state.loaded);
  const loadPreferences = useWorkspacePreferenceStore((state) => state.loadFromStorage);
  const preferences = useWorkspacePreferenceStore((state) => state.preferences);
  const dismissCoachMark = useWorkspacePreferenceStore((state) => state.dismissCoachMark);
  const pauseCoachMarksUntil = useWorkspacePreferenceStore((state) => state.pauseCoachMarksUntil);
  const contextId = getShortcutContextId(`${location.pathname}${location.search}`);

  useEffect(() => {
    if (!preferencesLoaded) loadPreferences();
  }, [loadPreferences, preferencesLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    let disposed = false;
    const collectAnchors = () => {
      if (disposed) return;
      const nextRects = new Map<string, DOMRectReadOnly>();
      for (const element of document.querySelectorAll<HTMLElement>("[data-coach-anchor]")) {
        const anchorId = element.dataset.coachAnchor;
        if (!anchorId || !isVisibleAnchor(element)) continue;
        nextRects.set(anchorId, element.getBoundingClientRect());
      }
      setAnchorRects(nextRects);
      setBlockingUiOpen(hasBlockingUi());
    };
    const frame = window.requestAnimationFrame(collectAnchors);
    const observer = new MutationObserver(collectAnchors);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-coach-anchor"],
    });
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [contextId, location.pathname, location.search]);

  const mark = useMemo(() => {
    const selected = selectCoachMark({
    candidates: buildCoachMarkCandidates({
      contextId,
      privacyOn,
      viewportWidth,
      anchors: new Set(anchorRects.keys()),
    }),
    dismissedIds: preferences.dismissedCoachMarkIds,
    blocking: blocking || blockingUiOpen,
    overlayOpen,
    viewportWidth,
    now: Date.now(),
    pausedUntil: preferences.coachMarksPausedUntil,
  });
    if (!selected) return null;
    const anchorRect = anchorRects.get(selected.anchorId);
    return anchorRect
      ? { ...selected, position: positionCoachMark(anchorRect, selected.placement, viewportWidth) }
      : selected;
  }, [
    anchorRects,
    blocking,
    blockingUiOpen,
    contextId,
    overlayOpen,
    preferences.coachMarksPausedUntil,
    preferences.dismissedCoachMarkIds,
    privacyOn,
    viewportWidth,
  ]);

  return {
    view: { mark },
    actions: {
      dismiss: dismissCoachMark,
      skipAllForNow: () => pauseCoachMarksUntil(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  };
}

function isVisibleAnchor(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom < 0 || rect.right < 0) return false;
  if (rect.top > window.innerHeight || rect.left > window.innerWidth) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function hasBlockingUi(): boolean {
  return Boolean(document.querySelector(
    '[role="dialog"]:not(.shortcut-help-overlay), .business-export-dialog, .media-open-prompt',
  ));
}

function positionCoachMark(
  rect: DOMRectReadOnly,
  placement: CoachMarkView["placement"],
  viewportWidth: number,
): CoachMarkView["position"] {
  const gap = 12;
  const width = Math.min(360, Math.max(288, viewportWidth - 32));
  const left = clamp(rect.left, 16, Math.max(16, viewportWidth - width - 16));

  if (placement === "right" && rect.right + width + gap <= viewportWidth - 16) {
    return {
      top: Math.max(16, Math.round(rect.top)),
      left: Math.round(rect.right + gap),
    };
  }

  if (placement === "left" && rect.left - width - gap >= 16) {
    return {
      top: Math.max(16, Math.round(rect.top)),
      left: Math.round(rect.left - width - gap),
    };
  }

  if (placement === "top" && rect.top > 160) {
    return {
      left: Math.round(left),
      bottom: Math.max(16, Math.round(window.innerHeight - rect.top + gap)),
    };
  }

  return {
    top: Math.round(Math.min(window.innerHeight - 180, rect.bottom + gap)),
    left: Math.round(left),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
