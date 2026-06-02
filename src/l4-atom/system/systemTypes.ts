export type SetupMode = "managed" | "external";

export type ConfigSource =
  | "none"
  | "data-dir-chatlog-json"
  | "app-managed-server-config"
  | "manual-advanced"
  | "external-service";

export type PortState = "unknown" | "free" | "owned" | "external-chatlog" | "occupied";

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
