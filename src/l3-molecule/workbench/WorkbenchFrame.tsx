import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton, Typography } from "@l4/ui";
import type { WorkbenchLayout } from "./workbenchLayout";

interface WorkbenchFrameProps {
  layout: WorkbenchLayout;
  rail: ReactNode;
  conversationList: ReactNode;
  toolbar: ReactNode;
  inspector: ReactNode;
  inspectorTitle: string;
  inspectorOpen: boolean;
  onCloseInspector: () => void;
  children: ReactNode;
}

export function WorkbenchFrame({
  layout,
  rail,
  conversationList,
  toolbar,
  inspector,
  inspectorTitle,
  inspectorOpen,
  onCloseInspector,
  children,
}: WorkbenchFrameProps) {
  return (
    <>
      <div
        className="workbench-frame"
        data-mode={layout.mode}
        style={{ gridTemplateColumns: layout.gridTemplateColumns }}
      >
        {layout.mode !== "single" && (
          <aside className="workbench-frame__rail" aria-label="工作台导航">
            {rail}
          </aside>
        )}

        {layout.showConversationList && (
          <aside className="workbench-frame__list" aria-label="会话列表">
            {conversationList}
          </aside>
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
          <aside className="workbench-frame__inspector" aria-label={inspectorTitle}>
            {inspector}
          </aside>
        )}
      </div>

      {layout.inspectorMode === "drawer" && inspectorOpen && (
        <div className="workbench-frame__drawer-backdrop" role="presentation">
          <aside className="workbench-frame__drawer" aria-label={inspectorTitle}>
            <div className="workbench-frame__drawer-header">
              <Typography variant="label" weight={600}>
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
