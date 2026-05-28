import type { ReactNode } from "react";
import { Typography } from "@l4/ui";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-full w-full select-none">
      <header
        className="flex items-center justify-between h-10 px-4 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <div className="flex items-center gap-1.5">
            <button
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all"
              onClick={() => window.close?.()}
              aria-label="关闭"
            />
            <button
              className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:brightness-90 transition-all"
              aria-label="最小化"
            />
            <button
              className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-90 transition-all"
              aria-label="全屏"
            />
          </div>
        </div>
        <Typography variant="label" color="#8E8E93">
          chatlog_alpha
        </Typography>
        <div style={{ width: 56 }} />
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
