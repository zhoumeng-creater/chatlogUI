import packageJson from "../../../package.json";
import { getChatlogServiceBaseUrl } from "@l4/network/chatlogEndpoint";
import type { SidecarStatus } from "@l2/data-clerk/types/app";
import type {
  PortState,
  SetupMode,
  SetupProfileSummary,
} from "@l2/data-clerk/types/setup";
import type { UpdateStatus } from "@l2/api-docs/update";
import type { DiagnosticsManifestInput } from "./diagnostics";

interface BuildRuntimeDiagnosticsManifestInput {
  profile: SetupProfileSummary | null;
  mode: SetupMode;
  portState: PortState;
  httpReady: boolean;
  dbReady: boolean;
  sidecarStatus: SidecarStatus;
  updateStatus: UpdateStatus;
  privacyOn: boolean;
}

export function buildRuntimeDiagnosticsManifest({
  profile,
  mode,
  portState,
  httpReady,
  dbReady,
  sidecarStatus,
  updateStatus,
  privacyOn,
}: BuildRuntimeDiagnosticsManifestInput): DiagnosticsManifestInput {
  return {
    appVersion: packageJson.version,
    buildChannel: getBuildChannel(),
    updaterEnabled: isUpdaterBuildEnabled(),
    platform: profile?.platform ?? null,
    architecture: null,
    packageReadiness: getPackageReadiness(mode, profile),
    backendBaseUrl: getBackendBaseUrl(profile),
    sidecarState: sidecarStatus,
    portState,
    httpReady,
    dbReady,
    setupMode: mode,
    configSource: profile?.source ?? "none",
    updateStatus,
    releaseSmoke: "not run",
    redactionState: privacyOn ? "privacy-on" : "privacy-off",
  };
}

function getBackendBaseUrl(profile: SetupProfileSummary | null): string {
  return getChatlogServiceBaseUrl({ serviceBaseUrl: profile?.httpAddr });
}

function getBuildChannel(): string {
  return import.meta.env.PROD ? "prod" : "dev";
}

function isUpdaterBuildEnabled(): boolean {
  return import.meta.env.PROD && import.meta.env.VITE_ENABLE_UPDATER === "true";
}

function getPackageReadiness(
  mode: SetupMode,
  profile: SetupProfileSummary | null,
): string {
  if (!profile) return "profile-missing";
  if (mode === "managed") return "managed-sidecar-configured";
  return "external-or-manual";
}
