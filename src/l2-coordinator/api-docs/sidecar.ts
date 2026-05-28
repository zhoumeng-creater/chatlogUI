export interface DbStatusResponse {
  ok: boolean;
  message: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  attempts: number;
  elapsedMs: number;
  lastError?: string;
}

export interface DbReadyResult {
  ready: boolean;
  message: string;
  dbCount: number;
}

export interface DbInfo {
  name: string;
  path: string;
  tables: string[];
}
