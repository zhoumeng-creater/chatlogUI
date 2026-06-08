import { Lock, Settings, Terminal, Unlock } from "lucide-react";
import { IconButton } from "@l4/ui";

interface GlobalCommandClusterProps {
  privacyOn: boolean;
  onTogglePrivacy: () => void;
  onToggleConsole: () => void;
  onOpenSettings: () => void;
}

export function GlobalCommandCluster({
  privacyOn,
  onTogglePrivacy,
  onToggleConsole,
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
      />
      <IconButton
        label="开发者控制台"
        tooltip="打开开发者控制台"
        tooltipPlacement="bottom"
        icon={<Terminal size={16} />}
        onClick={onToggleConsole}
      />
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
