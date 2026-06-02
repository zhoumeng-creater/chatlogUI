import { useEffect, useRef, useState } from "react";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";

type DiagnosticSourceFilter = "all" | "http" | "sidecar" | "tauri" | "ui" | "updater" | "release";
type DiagnosticLevelFilter = "all" | "debug" | "info" | "warn" | "error";
type DiagnosticPrivacyFilter = "all" | "safe" | "redacted" | "blocked";

interface DiagnosticConsoleRow {
  id: string;
  timestamp: string;
  source: Exclude<DiagnosticSourceFilter, "all">;
  level: Exclude<DiagnosticLevelFilter, "all">;
  privacy: Exclude<DiagnosticPrivacyFilter, "all">;
  category: string;
  summary: string;
  attributes?: Record<string, string | number | boolean | null>;
}

interface DevConsoleView {
  visible: boolean;
  autoScroll: boolean;
  rows: DiagnosticConsoleRow[];
  counts: {
    total: number;
    sidecarLogs: number;
    diagnosticEvents: number;
    warningsOrErrors: number;
    redactedOrBlocked: number;
  };
  filters: {
    source: DiagnosticSourceFilter;
    level: DiagnosticLevelFilter;
    privacy: DiagnosticPrivacyFilter;
  };
  emptyMessage: string;
  activeEmptyMessage: string;
}

interface DevConsoleActions {
  toggle: () => void;
  clear: () => void;
  exportLogs: () => Promise<string | null>;
  setSourceFilter: (source: DiagnosticSourceFilter) => void;
  setLevelFilter: (level: DiagnosticLevelFilter) => void;
  setPrivacyFilter: (privacy: DiagnosticPrivacyFilter) => void;
}

interface DevConsoleProps {
  view: DevConsoleView;
  actions: DevConsoleActions;
}

export function DevConsole({ view, actions }: DevConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (scrollRef.current && view.visible && view.autoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [view.rows, view.visible, view.autoScroll]);

  const handleExport = async () => {
    const path = await actions.exportLogs();
    setStatusMessage(path ? `诊断已导出到: ${path}` : "诊断导出失败，请检查脱敏状态。");
  };

  if (!view.visible) return null;

  const emptyMessage = view.counts.total === 0
    ? view.emptyMessage
    : view.activeEmptyMessage;

  return (
    <div className="dev-console">
      <div className="dev-console__header">
        <Typography variant="caption" weight={600} color="var(--text-secondary)">
          开发者控制台
          <span className="dev-console__count">{view.counts.total} 条事件</span>
        </Typography>
        <div className="dev-console__actions">
          <Button variant="ghost" size="sm" onClick={handleExport}>导出诊断</Button>
          <Button variant="ghost" size="sm" onClick={actions.clear}>清空</Button>
          <Button variant="ghost" size="sm" onClick={actions.toggle}>关闭</Button>
        </div>
      </div>
      <div className="dev-console__summary" aria-label="诊断事件摘要">
        <span>Sidecar {view.counts.sidecarLogs}</span>
        <span>诊断 {view.counts.diagnosticEvents}</span>
        <span>警告/错误 {view.counts.warningsOrErrors}</span>
        <span>脱敏/阻止 {view.counts.redactedOrBlocked}</span>
      </div>
      <div className="dev-console__filters" aria-label="诊断事件筛选">
        <label>
          来源
          <select
            value={view.filters.source}
            onChange={(event) =>
              actions.setSourceFilter(event.currentTarget.value as DiagnosticSourceFilter)
            }
          >
            <option value="all">全部</option>
            <option value="sidecar">Sidecar</option>
            <option value="http">HTTP</option>
            <option value="tauri">Tauri</option>
            <option value="ui">UI</option>
            <option value="updater">更新</option>
            <option value="release">发布</option>
          </select>
        </label>
        <label>
          等级
          <select
            value={view.filters.level}
            onChange={(event) =>
              actions.setLevelFilter(event.currentTarget.value as DiagnosticLevelFilter)
            }
          >
            <option value="all">全部</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
        </label>
        <label>
          隐私
          <select
            value={view.filters.privacy}
            onChange={(event) =>
              actions.setPrivacyFilter(event.currentTarget.value as DiagnosticPrivacyFilter)
            }
          >
            <option value="all">全部</option>
            <option value="safe">安全</option>
            <option value="redacted">已脱敏</option>
            <option value="blocked">已阻止</option>
          </select>
        </label>
      </div>
      <p className="dev-console__status" aria-live="polite">{statusMessage}</p>
      <div ref={scrollRef} className="dev-console__body">
        {view.rows.length === 0 && (
          <Typography variant="caption" color="var(--text-muted)">
            {emptyMessage}
          </Typography>
        )}
        {view.rows.map((row) => (
          <div key={row.id} className="dev-console__line">
            <span className="dev-console__time">{formatTimestamp(row.timestamp)}</span>
            <span className={`dev-console__source dev-console__source--${row.source}`}>
              {getSourceLabel(row.source)}
            </span>
            <span className={`dev-console__level dev-console__level--${row.level}`}>
              {getLevelLabel(row.level)}
            </span>
            <span className={`dev-console__privacy dev-console__privacy--${row.privacy}`}>
              {getPrivacyLabel(row.privacy)}
            </span>
            <span className="dev-console__category">{row.category}</span>
            <span className="dev-console__message">{row.summary}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getSourceLabel(source: string): string {
  if (source === "sidecar") return "Sidecar";
  if (source === "http") return "HTTP";
  if (source === "tauri") return "Tauri";
  if (source === "updater") return "Update";
  if (source === "release") return "Release";
  return "UI";
}

function getLevelLabel(level: string): string {
  return level.toUpperCase();
}

function getPrivacyLabel(privacy: string): string {
  if (privacy === "redacted") return "脱敏";
  if (privacy === "blocked") return "阻止";
  return "安全";
}

function formatTimestamp(timestamp: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(timestamp)) return timestamp;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}
