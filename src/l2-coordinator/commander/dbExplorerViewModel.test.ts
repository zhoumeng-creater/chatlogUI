import { describe, expect, it } from "vitest";
import {
  buildDbExplorerView,
  deriveDeveloperBadge,
} from "./dbExplorerViewModel";
import type { DeveloperToolsStoreSnapshot } from "./dbExplorerViewModel";

describe("dbExplorerViewModel", () => {
  it("builds a DB explorer view and masks private DB values in privacy mode", () => {
    const state = snapshot();

    expect(buildDbExplorerView(state, false)).toMatchObject({
      title: "开发者工具",
      dbSummary: "1 个数据库文件 · 2 张表",
      selectedFile: {
        displayName: "MSG0.db",
      },
      tableData: {
        rows: [{ cells: { content: "Synthetic private row" } }],
      },
    });

    const privateView = buildDbExplorerView(state, true);
    expect(privateView.selectedFile?.displayName).toBe("已隐藏数据库文件");
    expect(privateView.files[0].displayName).toBe("已隐藏数据库文件");
    expect(privateView.tableData.columns).toEqual(["列 1", "列 2"]);
    expect(privateView.tableData.rows[0].cells["列 2"]).toBe("已隐藏");
    expect(privateView.searchResults.items[0].table).toBe("已隐藏");
    expect(privateView.searchResults.items[0].column).toBe("已隐藏");
    expect(privateView.searchResults.items[0].preview).toBe("已隐藏");
    expect(JSON.stringify(privateView)).not.toContain("Synthetic private row");
    expect(JSON.stringify(privateView)).not.toContain("StrContent");
  });

  it("derives compact developer rail badges from active statuses", () => {
    expect(deriveDeveloperBadge({ ...snapshot(), dbFilesStatus: "loading" })).toBe("加载中");
    expect(deriveDeveloperBadge({ ...snapshot(), runnerStatus: "error" })).toBe("异常");
    expect(deriveDeveloperBadge(snapshot())).toBe("1库");
  });
});

function snapshot(): DeveloperToolsStoreSnapshot {
  return {
    activeTab: "db",
    dbFilesStatus: "ready",
    tablesStatus: "ready",
    tableDataStatus: "ready",
    searchStatus: "ready",
    queryStatus: "idle",
    cacheStatus: "idle",
    runnerStatus: "idle",
    dbFiles: [
      {
        id: "MicroMsg/MSG0.db",
        group: "MicroMsg",
        file: "MSG0.db",
        displayName: "MSG0.db",
        groupLabel: "MicroMsg",
        category: "message",
      },
    ],
    selectedDbFileId: "MicroMsg/MSG0.db",
    tables: ["MSG", "Contact"],
    selectedTable: "MSG",
    tableData: {
      columns: ["id", "content"],
      rows: [{ id: "1", cells: { id: "1", content: "Synthetic private row" } }],
      rowCount: 1,
      columnCount: 2,
      isEmpty: false,
    },
    tableKeyword: "",
    tableLimit: 50,
    tableOffset: 0,
    searchQuery: "private",
    searchMode: "quick",
    searchLimit: 50,
    searchResults: {
      keyword: "private",
      mode: "quick",
      total: 1,
      items: [
        {
          id: "MicroMsg/MSG0.db/MSG/StrContent/1",
          group: "MicroMsg",
          file: "MSG0.db",
          dbName: "MSG0.db",
          table: "MSG",
          column: "StrContent",
          rowId: "1",
          preview: "Synthetic private preview",
          rowSummary: "content=[text:24]",
        },
      ],
    },
    sqlDraft: "",
    queryResult: null,
    cacheConfirmationPending: false,
    cacheClearResult: null,
    selectedEndpointId: "health",
    endpointParams: {},
    runnerConfirmationPending: false,
    runnerResult: null,
    runnerHistory: [],
    dbFilesError: null,
    tablesError: null,
    tableDataError: null,
    searchError: null,
    queryError: null,
    cacheError: null,
    runnerError: null,
  };
}
