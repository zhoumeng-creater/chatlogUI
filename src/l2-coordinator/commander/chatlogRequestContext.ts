import type { SetupMode, SetupProfileSummary } from "@l2/data-clerk/types/setup";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import type { RequestDiagnosticsOptions } from "@l4/network";
import {
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
  const mode = profile?.mode ?? "managed";
  const serviceBaseUrl = getChatlogServiceBaseUrl({
    serviceBaseUrl: profile?.httpAddr,
  });

  return {
    serviceBaseUrl,
    serviceLabel: formatActiveServiceLabel(mode),
    mode,
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

function formatActiveServiceLabel(mode: SetupMode): string {
  return mode === "external" ? "已连接外部本机服务" : "应用管理的本机服务";
}
