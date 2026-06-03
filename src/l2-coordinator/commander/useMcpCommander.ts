import { useCallback, useMemo } from "react";
import { getStaticMcpInventory } from "@l4/network";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useMcpStore } from "@l2/data-clerk/stores/useMcpStore";
import { buildMcpView } from "./mcpViewModel";
import { createDiagnosticEventSink } from "./diagnosticEventBridge";

const MCP_CORRELATION_ID = "p4e-mcp";

const recordMcpEvent = createDiagnosticEventSink({
  source: "ui",
  category: "mcp.inventory",
  correlationId: MCP_CORRELATION_ID,
  recoveryHint: "none",
});

export function useMcpCommander() {
  const store = useMcpStore();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const mcpView = useMemo(() => buildMcpView(store, privacyOn), [store, privacyOn]);

  const loadMcpInventory = useCallback(() => {
    useMcpStore.getState().setInventoryLoading();
    try {
      const inventory = getStaticMcpInventory();
      useMcpStore.getState().setInventory(inventory);
      recordMcpEvent({
        summary: "MCP inventory loaded from local contract",
        privacy: "safe",
        attributes: { count: inventory.tools.length + inventory.prompts.length, redactionOk: true },
      });
    } catch {
      useMcpStore.getState().setInventoryError("加载 MCP 清单失败");
    }
  }, []);

  const runSafeRouteSmoke = useCallback(() => {
    useMcpStore.getState().setSmokeLoading();
    const inventory = useMcpStore.getState().inventory ?? getStaticMcpInventory();
    const route = inventory.routes.find((item) => item.path === "/mcp") ?? inventory.routes[0];
    useMcpStore.getState().setSmokeResult({
      route: route?.path ?? "/mcp",
      status: route?.status ?? "unknown",
      checkedAt: new Date().toISOString(),
    });
  }, []);

  return {
    ...store,
    mcpView,
    privacyOn,
    loadMcpInventory,
    refreshMcpInventory: loadMcpInventory,
    runSafeRouteSmoke,
  };
}
