import type { CSSProperties, ReactNode } from "react";

interface AppTitleBarProps {
  title: string;
  status: ReactNode;
  actions: ReactNode;
}

const dragRegionStyle = { WebkitAppRegion: "drag" } as CSSProperties;
const noDragRegionStyle = { WebkitAppRegion: "no-drag" } as CSSProperties;

export function AppTitleBar({ title, status, actions }: AppTitleBarProps) {
  return (
    <header className="app-titlebar" style={dragRegionStyle}>
      <div className="app-titlebar__brand" style={noDragRegionStyle}>
        <span className="app-titlebar__product">chatlog_alpha</span>
        {status}
      </div>
      <div className="app-titlebar__center" aria-label={title}>
        {title}
      </div>
      <div style={noDragRegionStyle}>{actions}</div>
    </header>
  );
}
