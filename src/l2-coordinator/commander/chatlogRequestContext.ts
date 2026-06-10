import type { SetupMode, SetupProfileSummary } from "@l2/data-clerk/types/setup";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import type { RequestDiagnosticsOptions } from "@l4/network";
import {
  formatChatlogServiceLabel,
  getChatlogServiceBaseUrl,
} from "@l4/network/chatlogEndpoint";

export interface ActiveChatlogServiceSummary {
  serviceBaseUrl: string;
  serviceLabel: string;
  mode: SetupMode;
}

export type ChatlogRequestContext = RequestDiagnosticsOptions & {
  serviceBaseUrl: string;
};

export function getActiveChatlogServiceSummary(
  profile: SetupProfileSummary | null,
): ActiveChatlogServiceSummary {
  const serviceBaseUrl = getChatlogServiceBaseUrl({
    serviceBaseUrl: profile?.httpAddr,
  });

  return {
    serviceBaseUrl,
    serviceLabel: formatChatlogServiceLabel(serviceBaseUrl),
    mode: profile?.mode ?? "managed",
  };
}

export function createChatlogRequestContext(
  profile: SetupProfileSummary | null,
  options: RequestDiagnosticsOptions = {},
): ChatlogRequestContext {
  return {
    ...options,
    serviceBaseUrl: getActiveChatlogServiceSummary(profile).serviceBaseUrl,
  };
}

export function createCurrentChatlogRequestContext(
  options: RequestDiagnosticsOptions = {},
): ChatlogRequestContext {
  return createChatlogRequestContext(useSetupStore.getState().profile, options);
}
