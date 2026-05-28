import { invoke } from "@tauri-apps/api/core";
import { SIDECAR_PORT } from "@/utils/constants";

export async function killPort(port: number = SIDECAR_PORT): Promise<void> {
  await invoke("kill_port", { port });
}
