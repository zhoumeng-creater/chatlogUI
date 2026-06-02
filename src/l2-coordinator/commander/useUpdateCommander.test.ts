import { beforeEach, describe, expect, it } from "vitest";
import { useDiagnosticEventStore } from "@/l2-coordinator/data-clerk/stores/useDiagnosticEventStore";
import { recordUpdateDiagnosticEvent } from "./useUpdateCommander";

describe("useUpdateCommander diagnostics", () => {
  beforeEach(() => {
    useDiagnosticEventStore.setState({
      items: [],
      filters: {
        source: "all",
        level: "all",
        privacy: "all",
        endpointFamily: "all",
        failedOnly: false,
        timeRange: "all",
      },
    });
  });

  it("records updater failures as redacted diagnostic events", () => {
    recordUpdateDiagnosticEvent({
      level: "error",
      category: "update.check.failed",
      summary: "Update check failed token=raw-update-token",
      recoveryHint: "open-settings",
    });

    const [event] = useDiagnosticEventStore.getState().items;
    expect(event).toMatchObject({
      source: "updater",
      level: "error",
      category: "update.check.failed",
      recoveryHint: "open-settings",
    });
    expect(JSON.stringify(event)).not.toContain("raw-update-token");
  });
});
