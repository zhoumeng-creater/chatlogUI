import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton, Typography } from "@l4/ui";
import type { WorkbenchLayout, WorkbenchPanel } from "@l2/commander/workbenchLayout";
import {
  getWorkbenchDrawerDialogProps,
  restoreFocusTarget,
  shouldCloseWorkbenchDrawerOnKey,
  trapWorkbenchDrawerFocus,
  type FocusTarget,
} from "./workbenchAccessibility";
import { WorkspacePanelSplitter } from "@l3/workspace/WorkspacePanelSplitter";

interface WorkbenchFrameProps {
  layout: WorkbenchLayout;
  conversationList: ReactNode;
  toolbar: ReactNode;
  inspector: ReactNode;
  inspectorTitle: string;
  inspectorOpen: boolean;
  onResizePanel?: (panel: WorkbenchPanel, value: number) => void;
  onResetPanel?: (panel: WorkbenchPanel) => void;
  onCloseInspector: () => void;
  children: ReactNode;
}

export function WorkbenchFrame({
  layout,
  conversationList,
  toolbar,
  inspector,
  inspectorTitle,
  inspectorOpen,
  onResizePanel,
  onResetPanel,
  onCloseInspector,
  children,
}: WorkbenchFrameProps) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<FocusTarget | null>(null);
  const drawerTitleId = useId();
  const drawerIsOpen = layout.inspectorMode === "drawer" && inspectorOpen;
  const conversationListSplitter = layout.splitters.find((splitter) => splitter.panel === "conversationList");
  const inspectorSplitter = layout.splitters.find((splitter) => splitter.panel === "inspector");

  useEffect(() => {
    if (!drawerIsOpen || typeof document === "undefined") return undefined;

    previousFocusRef.current = document.activeElement as FocusTarget | null;
    const closeButton = drawerRef.current?.querySelector<HTMLButtonElement>("button");
    const focusTarget = closeButton ?? drawerRef.current;
    focusTarget?.focus();

    return () => {
      restoreFocusTarget(previousFocusRef.current);
      previousFocusRef.current = null;
    };
  }, [drawerIsOpen]);

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (trapWorkbenchDrawerFocus(event.currentTarget, document.activeElement, event)) return;
    if (!shouldCloseWorkbenchDrawerOnKey(event.key)) return;
    event.stopPropagation();
    onCloseInspector();
  }

  return (
    <>
      <div
        className="workbench-frame"
        data-mode={layout.mode}
        style={{ gridTemplateColumns: layout.gridTemplateColumns }}
      >
        {layout.showConversationList && (
          <>
            <aside className="workbench-frame__list" aria-label="会话列表">
              {conversationList}
            </aside>
            {layout.inspectorMode === "inline" && conversationListSplitter && (
              <WorkspacePanelSplitter
                {...conversationListSplitter}
                onChange={(value) => onResizePanel?.(conversationListSplitter.panel, value)}
                onReset={() => onResetPanel?.(conversationListSplitter.panel)}
              />
            )}
          </>
        )}

        <section className="workbench-frame__main" aria-label="会话工作区">
          <div className="workbench-frame__toolbar">
            {toolbar}
          </div>
          <div className="workbench-frame__content">
            {children}
          </div>
        </section>

        {layout.inspectorMode === "inline" && (
          <>
            {inspectorSplitter && (
              <WorkspacePanelSplitter
                {...inspectorSplitter}
                onChange={(value) => onResizePanel?.(inspectorSplitter.panel, value)}
                onReset={() => onResetPanel?.(inspectorSplitter.panel)}
              />
            )}
            <aside className="workbench-frame__inspector" aria-label={inspectorTitle}>
              {inspector}
            </aside>
          </>
        )}
      </div>

      {drawerIsOpen && (
        <div
          className="workbench-frame__drawer-backdrop"
          role="presentation"
          onClick={onCloseInspector}
        >
          <aside
            {...getWorkbenchDrawerDialogProps(drawerTitleId)}
            ref={drawerRef}
            className="workbench-frame__drawer"
            onKeyDown={handleDrawerKeyDown}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workbench-frame__drawer-header">
              <Typography id={drawerTitleId} variant="label" weight={600}>
                {inspectorTitle}
              </Typography>
              <IconButton
                label="关闭侧栏"
                tooltip="关闭侧栏"
                icon={<X size={16} />}
                onClick={onCloseInspector}
              />
            </div>
            {inspector}
          </aside>
        </div>
      )}
    </>
  );
}
