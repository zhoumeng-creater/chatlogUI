import type { SetupMode, SetupProfileSummary } from "@l2/data-clerk/types/setup";
import {
  DEFAULT_CHATLOG_SERVICE_BASE_URL,
  ChatlogEndpointError,
  validateChatlogServiceBaseUrl,
  type ChatlogServiceBaseUrlValidation,
} from "@l4/network/chatlogEndpoint";

export interface SetupServiceTargetState {
  mode: SetupMode;
  externalBaseUrlDraft: string;
  profile: SetupProfileSummary | null;
}

export function resolveSetupReadinessBaseUrl(
  state: SetupServiceTargetState,
): ChatlogServiceBaseUrlValidation {
  return validateChatlogServiceBaseUrl(resolveRawBaseUrl(state));
}

export function resolveSetupPortInspectionPort(state: SetupServiceTargetState): number {
  const validation = resolveSetupReadinessBaseUrl(state);
  if (!validation.ok) {
    throw new ChatlogEndpointError(validation.error);
  }
  return validation.port;
}

function resolveRawBaseUrl(state: SetupServiceTargetState): string {
  if (state.mode === "external") {
    return state.externalBaseUrlDraft || state.profile?.httpAddr || DEFAULT_CHATLOG_SERVICE_BASE_URL;
  }

  if (state.profile?.mode === "managed" && state.profile.source !== "external-service") {
    return state.profile.httpAddr;
  }

  return DEFAULT_CHATLOG_SERVICE_BASE_URL;
}
