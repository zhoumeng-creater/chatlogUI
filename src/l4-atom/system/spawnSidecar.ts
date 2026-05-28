import { invoke } from "@tauri-apps/api/core";

export async function spawnSidecar(): Promise<void> {
  await invoke("spawn_sidecar");
}
