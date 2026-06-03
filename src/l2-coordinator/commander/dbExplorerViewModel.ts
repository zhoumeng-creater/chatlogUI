import {
  classifyReadOnlySql,
  formatDbCellValue,
  maskDbFile,
  type AdaptedDbFile,
  type AdaptedDbRowsTable,
  type AdaptedDbSearchResponse,
  type ReadOnlySqlClassification,
} from "@l4/network";
import type {
  DeveloperToolsActiveTab,
  DeveloperToolsLoadStatus,
  EndpointRunnerHistoryItem,
} from "@l2/data-clerk/stores/useDeveloperToolsStore";
import type { ClearDbCacheResponse, EndpointRunResult } from "@l4/network";

export interface DeveloperToolsStoreSnapshot {
  activeTab: DeveloperToolsActiveTab;
  dbFilesStatus: DeveloperToolsLoadStatus;
  tablesStatus: DeveloperToolsLoadStatus;
  tableDataStatus: DeveloperToolsLoadStatus;
  searchStatus: DeveloperToolsLoadStatus;
  queryStatus: DeveloperToolsLoadStatus;
  cacheStatus: DeveloperToolsLoadStatus;
  runnerStatus: DeveloperToolsLoadStatus;
  dbFiles: AdaptedDbFile[];
  selectedDbFileId: string | null;
  tables: string[];
  selectedTable: string | null;
  tableData: AdaptedDbRowsTable | null;
  tableKeyword: string;
  tableLimit: number;
  tableOffset: number;
  searchQuery: string;
  searchMode: "quick" | "deep";
  searchLimit: number;
  searchResults: AdaptedDbSearchResponse | null;
  sqlDraft: string;
  queryResult: AdaptedDbRowsTable | null;
  cacheConfirmationPending: boolean;
  cacheClearResult: ClearDbCacheResponse | null;
  selectedEndpointId: string;
  endpointParams: Record<string, string | number | boolean | undefined>;
  runnerConfirmationPending: boolean;
  runnerResult: EndpointRunResult | null;
  runnerHistory: EndpointRunnerHistoryItem[];
  dbFilesError: string | null;
  tablesError: string | null;
  tableDataError: string | null;
  searchError: string | null;
  queryError: string | null;
  cacheError: string | null;
  runnerError: string | null;
}

export interface DbExplorerView {
  title: string;
  subtitle: string;
  dbSummary: string;
  files: AdaptedDbFile[];
  selectedFile: AdaptedDbFile | null;
  tables: string[];
  selectedTable: string | null;
  tableData: AdaptedDbRowsTable;
  searchResults: AdaptedDbSearchResponse;
  queryResult: AdaptedDbRowsTable;
  sqlClassification: ReadOnlySqlClassification;
  canRunQuery: boolean;
  cacheSummary: string;
  errorCopy: string | null;
}

const emptyTable: AdaptedDbRowsTable = {
  columns: [],
  rows: [],
  rowCount: 0,
  columnCount: 0,
  isEmpty: true,
};

const emptySearch: AdaptedDbSearchResponse = {
  keyword: "",
  mode: "quick",
  total: 0,
  items: [],
};

export function buildDbExplorerView(
  state: DeveloperToolsStoreSnapshot,
  privacyOn: boolean,
): DbExplorerView {
  const files = privacyOn ? state.dbFiles.map(maskDbFile) : state.dbFiles;
  const selectedFile =
    files.find((file) => file.id === state.selectedDbFileId) ?? null;
  const sqlClassification = classifyReadOnlySql(state.sqlDraft);
  const tableData = maskTableData(state.tableData ?? emptyTable, privacyOn);
  const queryResult = maskTableData(state.queryResult ?? emptyTable, privacyOn);
  const searchResults = maskSearchResults(state.searchResults ?? emptySearch, privacyOn);

  return {
    title: "开发者工具",
    subtitle: privacyOn
      ? "隐私模式已隐藏数据库文件名和结果值"
      : "DB Explorer 与本机 API 调试器",
    dbSummary: `${state.dbFiles.length.toLocaleString()} 个数据库文件 · ${state.tables.length.toLocaleString()} 张表`,
    files,
    selectedFile,
    tables: [...state.tables],
    selectedTable: state.selectedTable,
    tableData,
    searchResults,
    queryResult,
    sqlClassification,
    canRunQuery: Boolean(state.selectedDbFileId && sqlClassification.allowed),
    cacheSummary: cacheSummary(state),
    errorCopy:
      state.dbFilesError ??
      state.tablesError ??
      state.tableDataError ??
      state.searchError ??
      state.queryError ??
      state.cacheError,
  };
}

export function deriveDeveloperBadge(state: DeveloperToolsStoreSnapshot): string | undefined {
  const statuses = [
    state.dbFilesStatus,
    state.tablesStatus,
    state.tableDataStatus,
    state.searchStatus,
    state.queryStatus,
    state.cacheStatus,
    state.runnerStatus,
  ];

  if (statuses.includes("loading")) return "加载中";
  if (statuses.includes("error")) return "异常";
  if (state.dbFiles.length > 0) return `${Math.min(state.dbFiles.length, 99)}库`;
  if (state.runnerHistory.length > 0) return "API";
  return undefined;
}

function maskTableData(table: AdaptedDbRowsTable, privacyOn: boolean): AdaptedDbRowsTable {
  if (!privacyOn) return table;
  const columns = table.columns.map((_, index) => `列 ${index + 1}`);

  return {
    ...table,
    columns,
    rows: table.rows.map((row) => ({
      ...row,
      cells: table.columns.reduce<Record<string, string>>((cells, originalColumn, index) => {
        cells[columns[index]] = formatDbCellValue(row.cells[originalColumn], true);
        return cells;
      }, {}),
    })),
  };
}

function maskSearchResults(
  searchResults: AdaptedDbSearchResponse,
  privacyOn: boolean,
): AdaptedDbSearchResponse {
  if (!privacyOn) return searchResults;
  return {
    ...searchResults,
    keyword: searchResults.keyword ? "已隐藏" : "",
    items: searchResults.items.map((item, index) => ({
      ...item,
      id: `db-search-hit-${index + 1}`,
      group: item.group ? "已隐藏" : "",
      file: "已隐藏",
      dbName: "已隐藏",
      table: item.table ? "已隐藏" : "",
      column: item.column ? "已隐藏" : "",
      rowId: item.rowId ? "已隐藏" : "",
      preview: item.preview ? "已隐藏" : "",
      rowSummary: item.rowSummary ? "已隐藏" : "",
    })),
  };
}

function cacheSummary(state: DeveloperToolsStoreSnapshot): string {
  if (state.cacheStatus === "loading") return "正在清理缓存";
  if (state.cacheClearResult) {
    return `已删除 ${state.cacheClearResult.deletedCount.toLocaleString()} 个缓存文件`;
  }
  if (state.cacheConfirmationPending) return "等待确认后清理缓存";
  return "清理媒体缓存前需要显式确认";
}
