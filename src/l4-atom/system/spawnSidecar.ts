import { invoke } from "@tauri-apps/api/core";

export interface SpawnSidecarOptions {
  mode: "managed";
  configDir?: string | null;
  dataDir?: string | null;
  workDir?: string | null;
  httpAddr: string;
}

export interface SpawnSidecarPayload {
  mode: "managed";
  configDir: string | null;
  dataDir: string | null;
  workDir: string | null;
  httpAddr: string;
}

function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function createSpawnSidecarPayload(
  options: SpawnSidecarOptions,
): SpawnSidecarPayload {
  return {
    mode: "managed",
    configDir: normalize(options.configDir),
    dataDir: normalize(options.dataDir),
    workDir: normalize(options.workDir),
    httpAddr: normalize(options.httpAddr) ?? "127.0.0.1:5030",
  };
}

export async function spawnSidecar(
  options: SpawnSidecarOptions,
): Promise<void> {
  await invoke("spawn_sidecar", {
    plan: createSpawnSidecarPayload(options),
  });
}
