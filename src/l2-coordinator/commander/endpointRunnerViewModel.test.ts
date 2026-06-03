import { describe, expect, it } from "vitest";
import { buildEndpointRunnerView } from "./endpointRunnerViewModel";
import type { DeveloperToolsStoreSnapshot } from "./dbExplorerViewModel";

describe("endpointRunnerViewModel", () => {
  it("groups catalog entries and builds a safe request summary", () => {
    const view = buildEndpointRunnerView(snapshot(), false);

    expect(view.catalogGroups.map((group) => group.id)).toEqual(
      expect.arrayContaining(["core", "chat", "media", "sns", "db", "system"]),
    );
    expect(view.selectedEntry?.id).toBe("db_query");
    expect(view.requestSummary).toMatchObject({
      method: "GET",
      pathTemplate: "/api/v1/db/query",
      parameterKeys: ["group", "file", "sql"],
    });
    expect(JSON.stringify(view.requestSummary)).not.toContain("select * from MSG");
    expect(view.canRun).toBe(true);
  });

  it("keeps runner result preview redacted and masks draft params in privacy mode", () => {
    const view = buildEndpointRunnerView(snapshot(), true);

    expect(view.paramDrafts).toEqual([
      { name: "group", value: "已隐藏" },
      { name: "file", value: "已隐藏" },
      { name: "sql", value: "已隐藏" },
    ]);
    expect(view.result?.preview).toContain("[redacted]");
    expect(JSON.stringify(view)).not.toContain("Synthetic private response body");
    expect(JSON.stringify(view)).not.toContain("select * from MSG");
  });
});

function snapshot(): DeveloperToolsStoreSnapshot {
  return {
    activeTab: "api",
    dbFilesStatus: "ready",
    tablesStatus: "idle",
    tableDataStatus: "idle",
    searchStatus: "idle",
    queryStatus: "idle",
    cacheStatus: "idle",
    runnerStatus: "ready",
    dbFiles: [],
    selectedDbFileId: null,
    tables: [],
    selectedTable: null,
    tableData: null,
    tableKeyword: "",
    tableLimit: 50,
    tableOffset: 0,
    searchQuery: "",
    searchMode: "quick",
    searchLimit: 50,
    searchResults: null,
    sqlDraft: "",
    queryResult: null,
    cacheConfirmationPending: false,
    cacheClearResult: null,
    selectedEndpointId: "db_query",
    endpointParams: {
      group: "MicroMsg",
      file: "MSG0.db",
      sql: "select * from MSG",
    },
    runnerConfirmationPending: false,
    runnerResult: {
      entryId: "db_query",
      endpointFamily: "db_query",
      method: "GET",
      status: 200,
      durationMs: 9,
      parameterKeys: ["group", "file", "sql"],
      preview: "{ \"content\": \"[redacted]\" }",
      redacted: true,
    },
    runnerHistory: [
      {
        entryId: "db_query",
        endpointFamily: "db_query",
        method: "GET",
        status: 200,
        durationMs: 9,
        parameterKeys: ["group", "file", "sql"],
        redacted: true,
      },
    ],
    dbFilesError: null,
    tablesError: null,
    tableDataError: null,
    searchError: null,
    queryError: null,
    cacheError: null,
    runnerError: null,
  };
}
