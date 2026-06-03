import { beforeEach, describe, expect, it } from "vitest";
import { useDeveloperToolsStore } from "./useDeveloperToolsStore";
import type { AdaptedDbFile } from "@l4/network";

describe("useDeveloperToolsStore", () => {
  beforeEach(() => {
    useDeveloperToolsStore.getState().reset();
  });

  it("tracks DB explorer loading, selection, table data, query, and errors", () => {
    useDeveloperToolsStore.getState().setDbFilesLoading();
    expect(useDeveloperToolsStore.getState().dbFilesStatus).toBe("loading");

    useDeveloperToolsStore.getState().setDbFiles([file("MicroMsg", "MSG0.db")]);
    expect(useDeveloperToolsStore.getState()).toMatchObject({
      dbFilesStatus: "ready",
      selectedDbFileId: "MicroMsg/MSG0.db",
    });

    useDeveloperToolsStore.getState().setTables(["MSG", "Contact"]);
    useDeveloperToolsStore.getState().selectTable("MSG");
    useDeveloperToolsStore.getState().setTableData({
      columns: ["id", "summary"],
      rows: [{ id: "1", cells: { id: "1", summary: "Synthetic row" } }],
      rowCount: 1,
      columnCount: 2,
      isEmpty: false,
    });
    useDeveloperToolsStore.getState().setSqlDraft("select * from MSG");
    useDeveloperToolsStore.getState().setQueryResult({
      columns: ["id"],
      rows: [{ id: "1", cells: { id: "1" } }],
      rowCount: 1,
      columnCount: 1,
      isEmpty: false,
    });

    expect(useDeveloperToolsStore.getState()).toMatchObject({
      tablesStatus: "ready",
      selectedTable: "MSG",
      tableOffset: 0,
      tableDataStatus: "ready",
      queryStatus: "ready",
      sqlDraft: "select * from MSG",
    });

    useDeveloperToolsStore.getState().setQueryError("查询失败");
    expect(useDeveloperToolsStore.getState()).toMatchObject({
      queryStatus: "error",
      queryError: "查询失败",
    });
  });

  it("stores endpoint runner history as safe metadata only", () => {
    useDeveloperToolsStore.getState().selectEndpoint("db_query");
    useDeveloperToolsStore.getState().updateEndpointParam("sql", "select * from MSG");
    useDeveloperToolsStore.getState().setRunnerResult({
      entryId: "db_query",
      endpointFamily: "db_query",
      method: "GET",
      status: 200,
      durationMs: 12,
      parameterKeys: ["group", "file", "sql"],
      preview: "{ \"content\": \"[redacted]\" }",
      redacted: true,
    });

    const state = useDeveloperToolsStore.getState();
    expect(state.runnerStatus).toBe("ready");
    expect(state.runnerHistory).toEqual([
      {
        entryId: "db_query",
        endpointFamily: "db_query",
        method: "GET",
        status: 200,
        durationMs: 12,
        parameterKeys: ["group", "file", "sql"],
        redacted: true,
      },
    ]);
    expect(JSON.stringify(state.runnerHistory)).not.toContain("select * from MSG");
    expect(JSON.stringify(state.runnerHistory)).not.toContain("content");
  });

  it("requires an explicit cache clear confirmation state", () => {
    expect(useDeveloperToolsStore.getState().cacheConfirmationPending).toBe(false);
    useDeveloperToolsStore.getState().requestCacheClearConfirmation();
    expect(useDeveloperToolsStore.getState().cacheConfirmationPending).toBe(true);
    useDeveloperToolsStore.getState().setCacheClearResult({
      message: "Cache cleared successfully",
      deletedCount: 2,
    });
    expect(useDeveloperToolsStore.getState()).toMatchObject({
      cacheStatus: "ready",
      cacheConfirmationPending: false,
      cacheClearResult: {
        deletedCount: 2,
      },
    });
  });

  it("tracks runner confirmation and paged DB controls without leaking request values into history", () => {
    expect(useDeveloperToolsStore.getState()).toMatchObject({
      runnerConfirmationPending: false,
      tableOffset: 0,
      searchLimit: 50,
    });

    useDeveloperToolsStore.getState().setTableOffset(100);
    useDeveloperToolsStore.getState().setTableKeyword("private keyword");
    expect(useDeveloperToolsStore.getState()).toMatchObject({
      tableKeyword: "private keyword",
      tableOffset: 0,
    });

    useDeveloperToolsStore.getState().setTableOffset(100);
    useDeveloperToolsStore.getState().setTableLimit(25);
    expect(useDeveloperToolsStore.getState()).toMatchObject({
      tableLimit: 25,
      tableOffset: 0,
    });

    useDeveloperToolsStore.getState().setSearchLimit(200);
    expect(useDeveloperToolsStore.getState().searchLimit).toBe(200);

    useDeveloperToolsStore.getState().requestRunnerConfirmation();
    expect(useDeveloperToolsStore.getState().runnerConfirmationPending).toBe(true);
    useDeveloperToolsStore.getState().selectEndpoint("health");
    expect(useDeveloperToolsStore.getState().runnerConfirmationPending).toBe(false);
  });
});

function file(group: string, name: string): AdaptedDbFile {
  return {
    id: `${group}/${name}`,
    group,
    file: name,
    displayName: name,
    groupLabel: group,
    category: "message",
  };
}
