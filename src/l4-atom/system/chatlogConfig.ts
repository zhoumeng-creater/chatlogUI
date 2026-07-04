import { invoke } from "@tauri-apps/api/core";
import type { SetupProfileSummary } from "./systemTypes";

export interface ServerConfigDraft {
  type?: string | null;
  platform?: string | null;
  version?: number | null;
  fullVersion?: string | null;
  dataDir?: string | null;
  workDir?: string | null;
  dataKey?: string | null;
  imgKey?: string | null;
  httpAddr?: string | null;
  saveDecryptedMedia?: boolean | null;
}

export interface ConfigValidationError {
  code: string;
  field: string;
  message: string;
}

export interface ServerConfigPayload {
  type?: string | null;
  platform?: string | null;
  version?: number | null;
  full_version?: string | null;
  data_dir?: string | null;
  work_dir?: string | null;
  data_key?: string | null;
  img_key?: string | null;
  http_addr?: string | null;
  save_decrypted_media?: boolean | null;
}

type RawServerConfigDraft = Partial<ServerConfigDraft> & {
  type_?: string | null;
  full_version?: string | null;
  data_dir?: string | null;
  work_dir?: string | null;
  data_key?: string | null;
  img_key?: string | null;
  http_addr?: string | null;
  save_decrypted_media?: boolean | null;
};

export interface ExternalConnectionConfigDraft {
  httpAddr: string;
  port: number;
  lastValidatedAt?: string | null;
}

export interface ExternalConnectionConfigPayload {
  http_addr: string;
  port: number;
  last_validated_at?: string | null;
}

type RawConfigSummary = Partial<SetupProfileSummary> & {
  source: SetupProfileSummary["source"];
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
};

export function toServerConfigPayload(config: ServerConfigDraft): ServerConfigPayload {
  return {
    type: config.type,
    platform: config.platform,
    version: config.version,
    full_version: config.fullVersion,
    data_dir: config.dataDir,
    work_dir: config.workDir,
    data_key: config.dataKey,
    img_key: config.imgKey,
    http_addr: config.httpAddr,
    save_decrypted_media: config.saveDecryptedMedia,
  };
}

export function normalizeServerConfigDraft(
  config: RawServerConfigDraft,
  fallbackDataDir?: string,
): ServerConfigDraft {
  return {
    type: firstNonBlank(config.type, config.type_) ?? null,
    platform: firstNonBlank(config.platform) ?? null,
    version: config.version ?? null,
    fullVersion: firstNonBlank(config.fullVersion, config.full_version) ?? null,
    dataDir: firstNonBlank(config.dataDir, config.data_dir, fallbackDataDir) ?? null,
    workDir: firstNonBlank(config.workDir, config.work_dir) ?? null,
    dataKey: firstNonBlank(config.dataKey, config.data_key) ?? null,
    imgKey: firstNonBlank(config.imgKey, config.img_key) ?? null,
    httpAddr: firstNonBlank(config.httpAddr, config.http_addr) ?? null,
    saveDecryptedMedia: config.saveDecryptedMedia ?? config.save_decrypted_media ?? null,
  };
}

function firstNonBlank(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return value ?? undefined;
  }
  return undefined;
}

export function toExternalConnectionConfigPayload(
  config: ExternalConnectionConfigDraft,
): ExternalConnectionConfigPayload {
  return {
    http_addr: config.httpAddr,
    port: config.port,
    last_validated_at: config.lastValidatedAt,
  };
}

export function normalizeConfigSummary(summary: RawConfigSummary): SetupProfileSummary {
  return {
    mode: summary.mode ?? "managed",
    source: summary.source,
    configDir: summary.configDir,
    dataDir: summary.dataDir,
    workDir: summary.workDir,
    httpAddr: summary.httpAddr,
    port: summary.port,
    platform: summary.platform,
    version: summary.version,
    fullVersion: summary.fullVersion,
    hasDataKey: summary.hasDataKey,
    hasImgKey: summary.hasImgKey,
    lastValidatedAt: summary.lastValidatedAt ?? null,
  };
}

export async function importDataDirConfig(
  dataDir: string,
): Promise<SetupProfileSummary> {
  const summary = await invoke<RawConfigSummary>("import_data_dir_config", { dataDir });
  return normalizeConfigSummary(summary);
}

export async function readDataDirConfigDraft(
  dataDir: string,
): Promise<ServerConfigDraft> {
  const draft = await invoke<RawServerConfigDraft>("read_data_dir_config_draft", { dataDir });
  return normalizeServerConfigDraft(draft, dataDir);
}

export async function saveManagedServerConfig(
  config: ServerConfigDraft,
): Promise<SetupProfileSummary> {
  const summary = await invoke<RawConfigSummary>("save_managed_server_config", {
    config: toServerConfigPayload(config),
  });
  return normalizeConfigSummary(summary);
}

export async function loadManagedServerConfigSummary(): Promise<SetupProfileSummary | null> {
  const summary = await invoke<RawConfigSummary | null>("load_managed_server_config_summary");
  return summary ? normalizeConfigSummary(summary) : null;
}

export async function saveExternalConnectionConfig(
  config: ExternalConnectionConfigDraft,
): Promise<SetupProfileSummary> {
  const summary = await invoke<RawConfigSummary>("save_external_connection_config", {
    config: toExternalConnectionConfigPayload(config),
  });
  return normalizeConfigSummary(summary);
}

export async function loadExternalConnectionConfigSummary(): Promise<SetupProfileSummary | null> {
  const summary = await invoke<RawConfigSummary | null>("load_external_connection_config_summary");
  return summary ? normalizeConfigSummary(summary) : null;
}

export async function clearExternalConnectionConfig(): Promise<void> {
  await invoke("clear_external_connection_config");
}

export async function validateManagedServerConfig(
  config: ServerConfigDraft,
): Promise<ConfigValidationError[]> {
  return invoke("validate_managed_server_config", {
    config: toServerConfigPayload(config),
  });
}
