import type { McpInventory, McpInventoryItem, McpRouteStatus } from "@l4/network";
import type { McpLoadStatus, McpSmokeResult, McpStoreSnapshot } from "@l2/data-clerk/stores/useMcpStore";

export interface McpView {
  status: McpLoadStatus;
  smokeStatus: McpLoadStatus;
  summary: string;
  routes: McpRouteStatus[];
  tools: McpInventoryItem[];
  prompts: McpInventoryItem[];
  smokeResult: McpSmokeResult | null;
  smokeActionCopy: string;
  smokeResultCopy: string | null;
  forbiddenControls: string[];
  errorCopy: string | null;
}

const EMPTY_INVENTORY: McpInventory = {
  routes: [],
  tools: [],
  prompts: [],
};

export function buildMcpView(state: McpStoreSnapshot, _privacyOn: boolean): McpView {
  const inventory = state.inventory ?? EMPTY_INVENTORY;
  return {
    status: state.status,
    smokeStatus: state.smokeStatus,
    summary: `${inventory.tools.length} tools · ${inventory.prompts.length} prompts · ${inventory.routes.length} routes`,
    routes: inventory.routes,
    tools: inventory.tools,
    prompts: inventory.prompts,
    smokeResult: state.smokeResult,
    smokeActionCopy: "契约检查",
    smokeResultCopy: state.smokeResult
      ? `本地契约 ${state.smokeResult.route} · ${state.smokeResult.status} · ${state.smokeResult.checkedAt}`
      : null,
    forbiddenControls: ["remote host", "raw path", "raw headers", "raw body", "tool invocation"],
    errorCopy: state.error,
  };
}
