import type { IndexStatusResponse, SemanticConfig } from "@/l2-coordinator/api-docs/semantic";
import {
  buildSemanticConfigPayload,
  type SemanticConfigPayload,
  type SemanticIndexActionIntent,
  type SemanticSetupDraft,
  type SemanticSidecarIndexAction,
} from "./semanticSetupViewModel";

export type SemanticIndexPollingMode = "start" | "stop";

export interface SaveSemanticConfigDeps {
  saveConfig: (payload: SemanticConfigPayload) => Promise<void>;
  fetchConfig: () => Promise<SemanticConfig | null>;
}

export interface SaveSemanticConfigResult {
  payload: SemanticConfigPayload;
  config: SemanticConfig;
}

export interface RunSemanticIndexActionDeps {
  manageIndex: (action: SemanticSidecarIndexAction) => Promise<unknown>;
  fetchIndexStatus: () => Promise<IndexStatusResponse>;
}

export interface RunSemanticIndexActionResult {
  status: IndexStatusResponse;
  polling: SemanticIndexPollingMode;
}

export async function saveSemanticConfigWithRefetch(
  draft: SemanticSetupDraft,
  deps: SaveSemanticConfigDeps,
): Promise<SaveSemanticConfigResult> {
  const payload = buildSemanticConfigPayload(draft);
  await deps.saveConfig(payload);
  const config = await deps.fetchConfig();

  if (!config) {
    throw new Error("语义配置保存后无法读取后端配置。");
  }

  return { payload, config };
}

export async function runSemanticIndexActionWithRefetch(
  intent: SemanticIndexActionIntent,
  deps: RunSemanticIndexActionDeps,
): Promise<RunSemanticIndexActionResult> {
  await deps.manageIndex(intent.sidecarAction);
  const status = await deps.fetchIndexStatus();

  return {
    status,
    polling: shouldPollIndex(status) ? "start" : "stop",
  };
}

function shouldPollIndex(status: IndexStatusResponse): boolean {
  const state = status.state ?? status.status;
  return state === "running" || state === "building";
}
