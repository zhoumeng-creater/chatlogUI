import type { WorkbenchInspectorMode } from "./workbenchLayout";

export type WorkspaceCommandId =
  | "search-current"
  | "details"
  | "export-current"
  | "jump-date";

export type WorkspaceCommandGroup = "primary" | "secondary" | "overflow";

export interface WorkspaceCommandAction {
  id: WorkspaceCommandId;
  label: string;
  shortLabel: string;
  group: WorkspaceCommandGroup;
  disabled: boolean;
  disabledReason: string | null;
  minTargetPx: number;
}

export interface WorkspaceCommandBarModel {
  primary: WorkspaceCommandAction[];
  secondary: WorkspaceCommandAction[];
  overflow: WorkspaceCommandAction[];
}

interface BuildWorkspaceCommandBarInput {
  hasConversation: boolean;
  inspectorMode: WorkbenchInspectorMode;
  exportDisabledReason?: string | null;
}

export function buildWorkspaceCommandBar({
  hasConversation,
  inspectorMode,
  exportDisabledReason = null,
}: BuildWorkspaceCommandBarInput): WorkspaceCommandBarModel {
  const missingConversationReason = hasConversation ? null : "先选择一个会话。";
  const currentExportDisabledReason = hasConversation
    ? exportDisabledReason
    : "先选择一个会话。";

  const primary: WorkspaceCommandAction[] = [
    {
      id: "search-current",
      label: "搜索此会话",
      shortLabel: "搜索",
      group: "primary",
      disabled: !hasConversation,
      disabledReason: missingConversationReason,
      minTargetPx: 40,
    },
  ];

  const secondary: WorkspaceCommandAction[] = inspectorMode === "inline"
    ? []
    : [
        {
          id: "details",
          label: "会话详情",
          shortLabel: "详情",
          group: "secondary",
          disabled: !hasConversation,
          disabledReason: missingConversationReason,
          minTargetPx: 40,
        },
      ];

  const overflow: WorkspaceCommandAction[] = [
    {
      id: "export-current",
      label: "导出当前会话",
      shortLabel: "导出",
      group: "overflow",
      disabled: Boolean(currentExportDisabledReason),
      disabledReason: currentExportDisabledReason,
      minTargetPx: 32,
    },
    {
      id: "jump-date",
      label: "跳转日期",
      shortLabel: "日期",
      group: "overflow",
      disabled: !hasConversation,
      disabledReason: missingConversationReason,
      minTargetPx: 32,
    },
  ];

  return { primary, secondary, overflow };
}
