import type { SetupStateSnapshot, SetupStepId, WorkbenchAccess } from "@l2/data-clerk/types/setup";

export function deriveSetupStep(state: SetupStateSnapshot): SetupStepId {
  if (!state.profileComplete || state.source === "none") return "config";
  if (!state.configValid) return "config";
  if (!state.httpReady) return "service";
  if (!state.dbReady) return "database";
  return "ready";
}

export function deriveWorkbenchAccess(state: SetupStateSnapshot): WorkbenchAccess {
  if (state.dbReady) {
    return { allowed: true, connected: true, reason: "ready" };
  }
  if (!state.profileComplete || !state.configValid) {
    return { allowed: false, connected: false, reason: "setup-incomplete" };
  }
  if (!state.httpReady) {
    return { allowed: false, connected: false, reason: "service-not-ready" };
  }
  return { allowed: false, connected: false, reason: "db-not-ready" };
}
