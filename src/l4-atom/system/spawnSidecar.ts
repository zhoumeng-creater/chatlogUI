import { invoke } from "@tauri-apps/api/core";

export interface SpawnSidecarOptions {
  dataDir?: string | null;
  dataKey?: string | null;
  workDir?: string | null;
}

export interface SpawnSidecarPayload {
  dataDir: string | null;
  dataKey: string | null;
  workDir: string | null;
}

function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function createSpawnSidecarPayload(options: SpawnSidecarOptions = {}): SpawnSidecarPayload {
  return {
    dataDir: normalize(options.dataDir),
    dataKey: normalize(options.dataKey),
    workDir: normalize(options.workDir),
  };
}

export async function spawnSidecar(options: SpawnSidecarOptions = {}): Promise<void> {
  await invoke("spawn_sidecar", {
    options: createSpawnSidecarPayload(options),
  });
}
