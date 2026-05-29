export type SetupMode = "managed" | "external";

export type ConfigSource =
  | "none"
  | "data-dir-chatlog-json"
  | "app-managed-server-config"
  | "manual-advanced"
  | "external-service";

export type PortState = "unknown" | "free" | "owned" | "external-chatlog" | "occupied";

export type SetupStepId = "mode" | "config" | "service" | "database" | "ready";

export interface SetupStateSnapshot {
  mode: SetupMode;
  source: ConfigSource;
  profileComplete: boolean;
  configValid: boolean;
  portState: PortState;
  httpReady: boolean;
  dbReady: boolean;
}

export interface WorkbenchAccess {
  allowed: boolean;
  connected: boolean;
  reason: "ready" | "setup-incomplete" | "service-not-ready" | "db-not-ready";
}

export interface SetupProfileSummary {
  mode: SetupMode;
  source: ConfigSource;
  configDir: string | null;
  dataDir: string | null;
  workDir: string | null;
  httpAddr: string;
  port: number;
  platform: string | null;
  version: number | null;
  fullVersion: string | null;
  hasDataKey: boolean;
  hasImgKey: boolean;
  lastValidatedAt: string | null;
}
