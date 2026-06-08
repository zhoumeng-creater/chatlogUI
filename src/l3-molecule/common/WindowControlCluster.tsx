import { Copy, Minus, Square, X } from "lucide-react";
import { IconButton } from "@l4/ui";

interface WindowControlsView {
  minimizeLabel: string;
  toggleMaximizeLabel: string;
  closeLabel: string;
  isMaximized: boolean;
}

interface WindowControlClusterProps {
  controls: WindowControlsView;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

export function WindowControlCluster({
  controls,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowControlClusterProps) {
  return (
    <div className="app-window-control-cluster" aria-label="窗口控制">
      <IconButton
        label={controls.minimizeLabel}
        tooltip={controls.minimizeLabel}
        tooltipPlacement="bottom"
        icon={<Minus size={16} />}
        onClick={onMinimize}
      />
      <IconButton
        label={controls.toggleMaximizeLabel}
        tooltip={controls.toggleMaximizeLabel}
        tooltipPlacement="bottom"
        icon={controls.isMaximized ? <Copy size={15} /> : <Square size={14} />}
        onClick={onToggleMaximize}
      />
      <IconButton
        label={controls.closeLabel}
        tooltip={controls.closeLabel}
        tooltipPlacement="bottom"
        className="app-window-control-cluster__close"
        icon={<X size={16} />}
        onClick={onClose}
      />
    </div>
  );
}
