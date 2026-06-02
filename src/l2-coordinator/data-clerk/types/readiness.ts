export type ReadinessScope =
  | "setup"
  | "backend"
  | "database"
  | "settings"
  | "privacy"
  | "diagnostics"
  | "semantic"
  | "graph"
  | "release";

export type ReadinessStatus =
  | "idle"
  | "loading"
  | "empty"
  | "success"
  | "error"
  | "conflict"
  | "cancelled";

export type ReadinessTone = "neutral" | "info" | "success" | "warning" | "danger" | "ai";

export type RecoveryActionKind =
  | "retry"
  | "choose-directory"
  | "open-settings"
  | "copy-diagnostics"
  | "stop-stream"
  | "none";

export interface ReadinessRecoveryAction {
  label: string;
  kind: RecoveryActionKind;
}

export interface ReadinessState {
  scope: ReadinessScope;
  status: ReadinessStatus;
  title: string;
  message: string;
  recoveryAction?: ReadinessRecoveryAction;
  updatedAt: string;
  evidenceRef?: string;
}

export function createReadinessState(
  input: Omit<ReadinessState, "updatedAt"> & { updatedAt?: string },
): ReadinessState {
  return {
    ...input,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function getReadinessTone(status: ReadinessStatus): ReadinessTone {
  switch (status) {
    case "loading":
      return "info";
    case "success":
      return "success";
    case "error":
      return "danger";
    case "conflict":
      return "warning";
    case "idle":
    case "empty":
    case "cancelled":
      return "neutral";
  }
}
