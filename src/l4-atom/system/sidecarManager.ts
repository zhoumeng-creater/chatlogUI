import { invoke } from "@tauri-apps/api/core";
import type { PortState } from "@l2/data-clerk/types/setup";
import type { SpawnSidecarOptions } from "./spawnSidecar";
import { spawnSidecar } from "./spawnSidecar";

export interface PortInspection {
  port: number;
  owner: "Free" | "ManagedSidecar" | "ExternalChatlog" | "UnknownProcess";
  process: { pid: number; name: string; command: string } | null;
  canStopSafely: boolean;
}

export function toPortState(inspection: PortInspection): PortState {
  switch (inspection.owner) {
    case "Free":
      return "free";
    case "ManagedSidecar":
      return "owned";
    case "ExternalChatlog":
      return "external-chatlog";
    default:
      return "occupied";
  }
}

export async function inspectPort(port: number): Promise<PortInspection> {
  return invoke("inspect_port", { port });
}

export async function startManagedSidecar(
  options: SpawnSidecarOptions,
): Promise<void> {
  await spawnSidecar(options);
}

export async function stopManagedSidecar(): Promise<void> {
  await invoke("stop_managed_sidecar");
}
