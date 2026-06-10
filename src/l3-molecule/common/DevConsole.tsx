import { useEffect, useRef, useState } from "react";
import { Download, Trash2, X } from "lucide-react";
import { Typography } from "@l4/ui/Typography";
import { Button } from "@l4/ui/Button";
import { formatExportPathSummary } from "@/utils/privacyDisplay";

type DiagnosticSourceFilter = "all" | "http" | "sidecar" | "tauri" | "ui" | "updater" | "release";
type DiagnosticLevelFilter = "all" | "debug" | "info" | "warn" | "error";
type DiagnosticPrivacyFilter = "all" | "safe" | "redacted" | "blocked";
type DiagnosticTimeRangeFilter = "all" | "last15m" | "last1h" | "session";

interface DiagnosticFilterOption {
  value: string;
  label: string;
}

interface DiagnosticConsoleDetailRow {
  label: string;
  value: string;
}

interface DiagnosticConsoleRow {
  id: string;
  timestamp: string;
  source: Exclude<DiagnosticSourceFilter, "all">;
  level: Exclude<DiagnosticLevelFilter, "all">;
  privacy: Exclude<DiagnosticPrivacyFilter, "all">;
  category: string;
  summary: string;
  endpointFamily: string;
  statusLabel: string;
  durationLabel: string;
  recoveryLabel: string;
  isFailed: boolean;
  detailRows: DiagnosticConsoleDetailRow[];
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
    endpointFamily: string;
    failedOnly: boolean;
    timeRange: DiagnosticTimeRangeFilter;
  };
  endpointOptions: DiagnosticFilterOption[];
  timeRangeOptions: DiagnosticFilterOption[];
  hasActiveFilters: boolean;
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
  setEndpointFamilyFilter: (endpointFamily: string) => void;
  setFailedOnlyFilter: (failedOnly: boolean) => void;
  setTimeRangeFilter: (timeRange: DiagnosticTimeRangeFilter) => void;
}

interface DevConsoleProps {
  view: DevConsoleView;
  actions: DevConsoleActions;
}

export function DevConsole({ view, actions }: DevConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const selectedRow = view.rows.find((row) => row.id === selectedRowId) ?? null;

  useEffect(() => {
    if (scrollRef.current && view.visible && view.autoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [view.rows, view.visible, view.autoScroll]);

  useEffect(() => {
    if (selectedRowId && !view.rows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(null);
    }
  }, [selectedRowId, view.rows]);

  const handleExport = async () => {
    const path = await actions.exportLogs();
    setStatusMessage(formatDevConsoleExportStatus(path));
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
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={14} />
            导出
          </Button>
          <Button variant="ghost" size="sm" onClick={actions.clear}>
            <Trash2 size={14} />
            清空
          </Button>
          <Button variant="ghost" size="sm" onClick={actions.toggle}>
            <X size={14} />
            关闭
          </Button>
        </div>
      </div>
      <div className="dev-console__summary" aria-label="诊断事件摘要">
        <span>Sidecar {view.counts.sidecarLogs}</span>
        <span>诊断 {view.counts.diagnosticEvents}</span>
        <span>警告/错误 {view.counts.warningsOrErrors}</span>
        <span>脱敏/阻止 {view.counts.redactedOrBlocked}</span>
        {view.hasActiveFilters && <span>筛选中 {view.rows.length}</span>}
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
          端点
          <select
            value={view.filters.endpointFamily}
            onChange={(event) =>
              actions.setEndpointFamilyFilter(event.currentTarget.value)
            }
          >
            {view.endpointOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          时间
          <select
            value={view.filters.timeRange}
            onChange={(event) =>
              actions.setTimeRangeFilter(event.currentTarget.value as DiagnosticTimeRangeFilter)
            }
          >
            {view.timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="dev-console__checkbox">
          <input
            type="checkbox"
            checked={view.filters.failedOnly}
            onChange={(event) =>
              actions.setFailedOnlyFilter(event.currentTarget.checked)
            }
          />
          仅失败
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
          <button
            key={row.id}
            type="button"
            className={`dev-console__line${row.isFailed ? " dev-console__line--failed" : ""}`}
            aria-pressed={selectedRow?.id === row.id}
            onClick={() => setSelectedRowId(row.id)}
          >
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
            <span className="dev-console__endpoint">{row.endpointFamily}</span>
            <span className="dev-console__status-code">{row.statusLabel}</span>
            <span className="dev-console__duration">{row.durationLabel}</span>
            <span className="dev-console__category">{row.category}</span>
            <span className="dev-console__recovery">{row.recoveryLabel}</span>
            <span className="dev-console__message">{row.summary}</span>
          </button>
        ))}
      </div>
      {selectedRow && (
        <section className="dev-console__detail" aria-label="诊断事件详情">
          <div className="dev-console__detail-header">
            <Typography variant="caption" weight={700}>
              {selectedRow.category}
            </Typography>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRowId(null)}>
              <X size={14} />
              关闭详情
            </Button>
          </div>
          <Typography variant="caption" color="var(--text-secondary)">
            {selectedRow.summary}
          </Typography>
          <dl className="dev-console__detail-grid">
            {selectedRow.detailRows.map((detail) => (
              <div key={`${detail.label}-${detail.value}`}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

export function formatDevConsoleExportStatus(path: string | null): string {
  if (!path) return "诊断导出失败，请检查脱敏状态。";
  const summary = formatExportPathSummary(path);
  return summary === "诊断已导出" ? summary : `诊断已导出：${summary}`;
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
