export type AppPhase =
  | "idle"
  | "killing_port"
  | "spawning_sidecar"
  | "health_check"
  | "ready"
  | "error"
  | "db_connecting"
  | "db_not_found"
  | "db_decrypting";

export type SidecarStatus = "stopped" | "starting" | "running" | "error";

export type DbStatus = "disconnected" | "connecting" | "decrypting" | "ready" | "error";

export interface AppState {
  appPhase: AppPhase;
  errorMessage: string | null;
  sidecarStatus: SidecarStatus;
  portNumber: number;
  engineVersion: string | null;
  dbStatus: DbStatus;
  wxDataPath: string | null;
}

export interface AppActions {
  setPhase: (phase: AppPhase) => void;
  setError: (message: string) => void;
  clearError: () => void;
  setSidecarStatus: (status: SidecarStatus) => void;
  setEngineVersion: (version: string) => void;
  setDbStatus: (status: DbStatus) => void;
  setWxDataPath: (path: string | null) => void;
  reset: () => void;
}
