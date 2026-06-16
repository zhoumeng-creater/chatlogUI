export type AsyncTaskStatus =
  | "idle"
  | "pending"
  | "progress"
  | "success"
  | "empty"
  | "error"
  | "cancelling"
  | "cancelled"
  | "stale"
  | "partial"
  | "blocked";

export type AsyncTaskTone = "neutral" | "info" | "success" | "warning" | "danger";
export type AsyncTaskCancelKind = "none" | "abort" | "stop-waiting" | "safe-abandonment" | "pause-resume";

export interface AsyncTaskProgressInput {
  completed: number;
  total?: number | null;
}

export interface AsyncTaskProgress {
  completed: number;
  total: number | null;
  percent: number | null;
}

export interface AsyncTaskStateInput {
  status: AsyncTaskStatus;
  label: string;
  progress?: AsyncTaskProgressInput | null;
  cancelKind?: AsyncTaskCancelKind;
  retryable?: boolean;
  warnings?: string[];
  safeAbandonmentNote?: string | null;
}

export interface AsyncTaskState {
  status: AsyncTaskStatus;
  label: string;
  tone: AsyncTaskTone;
  busy: boolean;
  terminal: boolean;
  retryable: boolean;
  cancelKind: AsyncTaskCancelKind;
  progress: AsyncTaskProgress | null;
  warnings: string[];
  safeAbandonmentNote: string | null;
}

const BUSY_STATUSES = new Set<AsyncTaskStatus>(["pending", "progress", "cancelling"]);
const TERMINAL_STATUSES = new Set<AsyncTaskStatus>([
  "success",
  "empty",
  "error",
  "cancelled",
  "stale",
  "partial",
  "blocked",
]);

export function createAsyncTaskState(input: AsyncTaskStateInput): AsyncTaskState {
  const progress = normalizeProgress(input.progress);

  return {
    status: input.status,
    label: input.label,
    tone: getTone(input.status),
    busy: BUSY_STATUSES.has(input.status),
    terminal: TERMINAL_STATUSES.has(input.status),
    retryable: input.retryable ?? getDefaultRetryable(input.status),
    cancelKind: input.cancelKind ?? "none",
    progress,
    warnings: input.warnings ?? [],
    safeAbandonmentNote: input.safeAbandonmentNote ?? null,
  };
}

export function describeAsyncTaskState(state: AsyncTaskState): string {
  const progressText = state.progress?.percent === null || state.progress?.percent === undefined
    ? ""
    : `，${state.progress.percent}%`;

  switch (state.status) {
    case "idle":
      return `${state.label}待开始`;
    case "pending":
      return `${state.label}准备中`;
    case "progress":
      return `${state.label}进行中${progressText}`;
    case "success":
      return `${state.label}已完成`;
    case "empty":
      return `${state.label}没有可显示结果`;
    case "error":
      return `${state.label}失败`;
    case "cancelling":
      return `${state.label}正在停止等待`;
    case "cancelled":
      return `${state.label}已取消`;
    case "stale":
      return `${state.label}已过期`;
    case "partial":
      return `${state.label}部分完成`;
    case "blocked":
      return `${state.label}暂不可用`;
  }
}

export function isAsyncTaskBusy(state: AsyncTaskState): boolean {
  return state.busy;
}

export function isAsyncTaskTerminal(state: AsyncTaskState): boolean {
  return state.terminal;
}

function normalizeProgress(progress: AsyncTaskProgressInput | null | undefined): AsyncTaskProgress | null {
  if (!progress) return null;

  const completed = Math.max(0, Math.round(progress.completed));
  const total = typeof progress.total === "number" && Number.isFinite(progress.total) && progress.total > 0
    ? Math.round(progress.total)
    : null;
  const percent = total === null
    ? null
    : Math.min(100, Math.max(0, Math.round((completed / total) * 100)));

  return {
    completed,
    total,
    percent,
  };
}

function getTone(status: AsyncTaskStatus): AsyncTaskTone {
  switch (status) {
    case "pending":
    case "progress":
    case "cancelling":
      return "info";
    case "success":
      return "success";
    case "error":
      return "danger";
    case "empty":
    case "cancelled":
    case "partial":
    case "blocked":
      return "warning";
    case "idle":
    case "stale":
      return "neutral";
  }
}

function getDefaultRetryable(status: AsyncTaskStatus): boolean {
  return status === "error" || status === "cancelled" || status === "partial";
}
