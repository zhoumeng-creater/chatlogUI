import type { CSSProperties, ReactNode } from "react";

interface AppTitleBarProps {
  productName: string;
  title: string;
  status: ReactNode;
  actions: ReactNode;
  windowControls: ReactNode;
}

const dragRegionStyle = { WebkitAppRegion: "drag" } as CSSProperties;
const noDragRegionStyle = { WebkitAppRegion: "no-drag" } as CSSProperties;

export function AppTitleBar({ productName, title, status, actions, windowControls }: AppTitleBarProps) {
  return (
    <header className="app-titlebar" style={dragRegionStyle}>
      <div className="app-titlebar__brand" style={noDragRegionStyle}>
        <span className="app-titlebar__product">{productName}</span>
        {status}
      </div>
      <div className="app-titlebar__center" aria-label={title}>
        {title}
      </div>
      <div className="app-titlebar__actions" style={noDragRegionStyle}>
        {actions}
      </div>
      <div className="app-titlebar__window-controls" style={noDragRegionStyle}>
        {windowControls}
      </div>
    </header>
  );
}
