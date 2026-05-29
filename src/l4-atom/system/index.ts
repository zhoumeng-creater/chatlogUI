export { spawnSidecar } from "./spawnSidecar";
export type { SpawnSidecarOptions } from "./spawnSidecar";
export { detectWxPath } from "./detectWxPath";
export type { WxPathCandidate } from "./detectWxPath";
export { openDirectoryPicker } from "./openDirectoryPicker";
export { applyWindowMaterial } from "./applyWindowMaterial";
export { listenSidecarLogs } from "./listenSidecarLogs";
export type { SidecarLogPayload } from "./listenSidecarLogs";
export type { ServerConfigDraft, ConfigValidationError } from "./chatlogConfig";
export {
  importDataDirConfig,
  saveManagedServerConfig,
  loadManagedServerConfigSummary,
  validateManagedServerConfig,
} from "./chatlogConfig";
export {
  inspectPort,
  startManagedSidecar,
  stopManagedSidecar,
  toPortState,
} from "./sidecarManager";
export type { PortInspection } from "./sidecarManager";
