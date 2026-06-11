export interface DeveloperEntryPolicyInput {
  developerMode: boolean;
  developerEntryOverride?: boolean;
  activeModule: string;
}

export interface DeveloperTitlebarAction {
  label: string;
  tooltip: string;
}

export interface DeveloperEntryPolicy {
  visible: boolean;
  titlebarAction: DeveloperTitlebarAction | null;
  includeRailModule: boolean;
  includeToolbarAction: boolean;
  renderDeveloperInspector: boolean;
  safeActiveModule: string;
}

export function deriveDeveloperEntryPolicy(input: DeveloperEntryPolicyInput): DeveloperEntryPolicy {
  const visible = input.developerMode || input.developerEntryOverride === true;
  const safeActiveModule = !visible && input.activeModule === "developer"
    ? "chat"
    : input.activeModule;

  return {
    visible,
    titlebarAction: visible
      ? {
          label: "开发者控制台",
          tooltip: "打开开发者控制台",
        }
      : null,
    includeRailModule: visible,
    includeToolbarAction: visible,
    renderDeveloperInspector: visible && safeActiveModule === "developer",
    safeActiveModule,
  };
}
