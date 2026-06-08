import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DbExplorer } from "./DbExplorer";
import type { DbExplorerView } from "@l2/commander/dbExplorerViewModel";

describe("DbExplorer", () => {
  it("describes table filter and load disabled states without leaking table values", () => {
    const html = renderDbExplorer({ privacyOn: true });

    expect(html).toContain("隐私模式下不可筛选表数据");
    expect(html).toContain("关闭隐私模式后可继续筛选");
    expect(html).toContain("请先选择数据库表");
    expect(html).toContain("选择表后可加载数据");
    expect(html).not.toContain("synthetic private table value");
  });

  it("describes table pager boundaries", () => {
    const html = renderDbExplorer({
      view: view({
        selectedTable: "MSG",
        tableData: {
          columns: ["col"],
          rows: [{ id: "row-1", cells: { col: "synthetic private table value" } }],
          rowCount: 1,
          columnCount: 1,
          isEmpty: false,
        },
      }),
      tableLimit: 50,
      tableOffset: 0,
    });

    expect(html).toContain("当前已经是第一页");
    expect(html).toContain("当前没有下一页");
  });

  it("describes why cache clear is disabled while clearing", () => {
    const html = renderDbExplorer({ cacheStatus: "loading" });

    expect(html).toContain("正在清理缓存");
    expect(html).toContain("完成后可再次提交");
  });
});

function renderDbExplorer({
  view: nextView = view(),
  privacyOn = false,
  tableLimit = 50,
  tableOffset = 0,
  cacheStatus = "idle",
}: {
  view?: DbExplorerView;
  privacyOn?: boolean;
  tableLimit?: number;
  tableOffset?: number;
  cacheStatus?: "idle" | "loading" | "ready" | "empty" | "error";
} = {}): string {
  return renderToStaticMarkup(
    <DbExplorer
      view={nextView}
      privacyOn={privacyOn}
      dbFilesStatus="idle"
      tablesStatus="idle"
      tableDataStatus="idle"
      searchStatus="idle"
      queryStatus="idle"
      cacheStatus={cacheStatus}
      tableKeyword="synthetic private keyword"
      tableLimit={tableLimit}
      tableOffset={tableOffset}
      searchQuery=""
      searchMode="quick"
      searchLimit={50}
      sqlDraft=""
      cacheConfirmationPending={false}
      onRefresh={vi.fn()}
      onSelectDbFile={vi.fn()}
      onSelectTable={vi.fn()}
      onTableKeywordChange={vi.fn()}
      onTableLimitChange={vi.fn()}
      onLoadPreviousTablePage={vi.fn()}
      onLoadNextTablePage={vi.fn()}
      onLoadTableData={vi.fn()}
      onSearchQueryChange={vi.fn()}
      onSearchModeChange={vi.fn()}
      onSearchLimitChange={vi.fn()}
      onSearch={vi.fn()}
      onSqlDraftChange={vi.fn()}
      onRunSqlQuery={vi.fn()}
      onRequestCacheClearConfirmation={vi.fn()}
      onCancelCacheClearConfirmation={vi.fn()}
      onConfirmCacheClear={vi.fn()}
    />,
  );
}

function view(overrides: Partial<DbExplorerView> = {}): DbExplorerView {
  return {
    title: "开发者工具",
    subtitle: "DB Explorer",
    dbSummary: "1 个数据库文件 · 1 张表",
    files: [],
    selectedFile: null,
    tables: ["MSG"],
    selectedTable: null,
    tableData: {
      columns: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      isEmpty: true,
    },
    searchResults: {
      keyword: "",
      mode: "quick",
      total: 0,
      items: [],
    },
    queryResult: {
      columns: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      isEmpty: true,
    },
    sqlClassification: {
      allowed: false,
      kind: "blocked",
      reason: "empty",
      message: "请输入只读 SQL。",
    },
    canRunQuery: false,
    cacheSummary: "清理媒体缓存前需要显式确认",
    errorCopy: null,
    ...overrides,
  };
}
