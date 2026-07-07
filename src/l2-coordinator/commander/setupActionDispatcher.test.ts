import { describe, expect, it, vi } from "vitest";
import { runSetupAction, type SetupActionDispatcherDeps } from "./setupActionDispatcher";
import type { ServerConfigDraft } from "@l4/system";

type TestDeps = SetupActionDispatcherDeps & {
  readiness: {
    httpReady: boolean;
    dbReady: boolean;
  };
};

describe("runSetupAction", () => {
  it("opens the workbench after starting the managed service when HTTP and DB are ready", async () => {
    const events: string[] = [];
    const deps = createDeps({
      startManagedService: async () => {
        events.push("start-managed-service");
        deps.readiness.httpReady = true;
        deps.readiness.dbReady = true;
      },
      openWorkbench: () => {
        events.push("open-workbench");
      },
    });

    await runSetupAction("start-managed-service", deps);

    expect(events).toEqual(["start-managed-service", "open-workbench"]);
  });

  it("keeps the setup page visible after starting the service when the database is not ready", async () => {
    const deps = createDeps({
      startManagedService: async () => {
        deps.readiness.httpReady = true;
        deps.readiness.dbReady = false;
      },
    });

    await runSetupAction("start-managed-service", deps);

    expect(deps.openWorkbench).not.toHaveBeenCalled();
  });
});

function createDeps(overrides: Partial<TestDeps> = {}): TestDeps {
  return {
    ...createDepsBase(),
    ...overrides,
  };
}

function createDepsBase(): TestDeps {
  const readiness = {
    httpReady: false,
    dbReady: false,
  };
  const manualDraft: ServerConfigDraft = {
    dataDir: "",
    workDir: "",
    httpAddr: "127.0.0.1:5030",
  };

  return {
    readiness,
    manualDraft,
    externalBaseUrlDraft: "http://127.0.0.1:5030",
    chooseAndImportDataDirectory: vi.fn(async () => null),
    saveManualConfig: vi.fn(async (_draft: ServerConfigDraft) => undefined),
    startManagedService: vi.fn(async () => undefined),
    connectExternalService: vi.fn(async (_baseUrl: string) => undefined),
    checkReadiness: vi.fn(async () => undefined),
    inspectServicePort: vi.fn(async () => undefined),
    stopManagedService: vi.fn(async () => undefined),
    openWorkbench: vi.fn(),
    getReadiness: () => readiness,
  };
}
