import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDevConsoleCommander } from "@l2/commander/useDevConsoleCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";

export function DevConsole() {
  const { logs, visible, toggle, clear, exportLogs } = useDevConsoleCommander();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && visible) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, visible]);

  const handleExport = async () => {
    const path = await exportLogs();
    if (path) {
      alert(`日志已导出到: ${path}`);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 200, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            borderTop: "1px solid var(--color-border)",
            backgroundColor: "#1e1e2e",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" weight={600} color="rgba(255,255,255,0.5)">
              开发者控制台
              <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.3)" }}>
                {logs.length} 条日志
              </span>
            </Typography>
            <div style={{ display: "flex", gap: 4 }}>
              <AppleButton variant="ghost" size="sm" onClick={handleExport} style={{ padding: "0 8px", minWidth: 40, fontSize: 12 }}>
                导出
              </AppleButton>
              <AppleButton variant="ghost" size="sm" onClick={clear} style={{ padding: "0 8px", minWidth: 40, fontSize: 12 }}>
                清空
              </AppleButton>
              <AppleButton variant="ghost" size="sm" onClick={toggle} style={{ padding: "0 6px", minWidth: 24, fontSize: 12 }}>
                ×
              </AppleButton>
            </div>
          </div>
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "4px 12px",
              fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
              fontSize: 12,
              lineHeight: "18px",
            }}
          >
            {logs.length === 0 && (
              <Typography variant="caption" color="rgba(255,255,255,0.2)">
                等待 Sidecar 输出...
              </Typography>
            )}
            {logs.map((log) => (
              <div key={log.id} style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{log.time}</span>
                <span
                  style={{
                    color: getLogLevelColor(log.level),
                    flexShrink: 0,
                    width: 50,
                  }}
                >
                  {getLogLevelLabel(log.level)}
                </span>
                <span
                  style={{
                    color: getLogMessageColor(log.level),
                    wordBreak: "break-all",
                  }}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getLogLevelLabel(level: string): string {
  if (level === "stderr") return "STDERR";
  if (level === "error") return "ERROR";
  if (level === "system") return "SYS";
  return "STDOUT";
}

function getLogLevelColor(level: string): string {
  if (level === "stderr" || level === "error") return "#FF6B6B";
  if (level === "system") return "#8E8E93";
  return "rgba(255,255,255,0.7)";
}

function getLogMessageColor(level: string): string {
  if (level === "stderr" || level === "error") return "#FF6B6B";
  return "rgba(255,255,255,0.85)";
}
