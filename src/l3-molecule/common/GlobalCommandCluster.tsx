import { CircleHelp, Lock, Settings, Terminal, Unlock } from "lucide-react";
import { IconButton } from "@l4/ui";

interface GlobalCommandClusterProps {
  privacyOn: boolean;
  onTogglePrivacy: () => void;
  shortcutHelpAction?: {
    label: string;
    tooltip: string;
    onClick: () => void;
  };
  developerConsoleAction?: {
    label: string;
    tooltip: string;
    onClick: () => void;
  };
  onOpenSettings: () => void;
}

export function GlobalCommandCluster({
  privacyOn,
  onTogglePrivacy,
  shortcutHelpAction,
  developerConsoleAction,
  onOpenSettings,
}: GlobalCommandClusterProps) {
  return (
    <div className="app-command-cluster">
      <IconButton
        label={privacyOn ? "关闭隐私模式" : "开启隐私模式"}
        tooltip={privacyOn ? "关闭隐私模式" : "开启隐私模式"}
        tooltipPlacement="bottom"
        active={privacyOn}
        icon={privacyOn ? <Lock size={16} /> : <Unlock size={16} />}
        onClick={onTogglePrivacy}
        data-coach-anchor="privacy-toggle"
      />
      {shortcutHelpAction && (
        <IconButton
          label={shortcutHelpAction.label}
          tooltip={shortcutHelpAction.tooltip}
          tooltipPlacement="bottom"
          icon={<CircleHelp size={16} />}
          onClick={shortcutHelpAction.onClick}
          onPointerUp={(event) => event.preventDefault()}
        />
      )}
      {developerConsoleAction && (
        <IconButton
          label={developerConsoleAction.label}
          tooltip={developerConsoleAction.tooltip}
          tooltipPlacement="bottom"
          icon={<Terminal size={16} />}
          onClick={developerConsoleAction.onClick}
        />
      )}
      <IconButton
        label="设置"
        tooltip="打开设置"
        tooltipPlacement="bottom"
        icon={<Settings size={16} />}
        onClick={onOpenSettings}
      />
    </div>
  );
}
