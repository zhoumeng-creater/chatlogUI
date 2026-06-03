import { create } from "zustand";
import type {
  AdaptedDbFile,
  AdaptedDbRowsTable,
  AdaptedDbSearchResponse,
  ClearDbCacheResponse,
  EndpointRunResult,
} from "@l4/network";

export type DeveloperToolsActiveTab = "db" | "api" | "hook" | "mcp";
export type DeveloperToolsLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface EndpointRunnerHistoryItem {
  entryId: string;
  endpointFamily: string;
  method: EndpointRunResult["method"];
  status: number;
  durationMs: number;
  parameterKeys: string[];
  redacted: true;
}

interface DeveloperToolsState {
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

interface DeveloperToolsActions {
  setActiveTab: (tab: DeveloperToolsActiveTab) => void;
  setDbFilesLoading: () => void;
  setDbFiles: (files: AdaptedDbFile[]) => void;
  setDbFilesError: (error: string) => void;
  selectDbFile: (fileId: string | null) => void;
  setTablesLoading: () => void;
  setTables: (tables: string[]) => void;
  setTablesError: (error: string) => void;
  selectTable: (table: string | null) => void;
  setTableKeyword: (keyword: string) => void;
  setTableLimit: (limit: number) => void;
  setTableOffset: (offset: number) => void;
  setTableDataLoading: () => void;
  setTableData: (tableData: AdaptedDbRowsTable) => void;
  setTableDataError: (error: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchMode: (mode: "quick" | "deep") => void;
  setSearchLimit: (limit: number) => void;
  setSearchLoading: () => void;
  setSearchResults: (results: AdaptedDbSearchResponse) => void;
  setSearchError: (error: string) => void;
  setSqlDraft: (sql: string) => void;
  setQueryLoading: () => void;
  setQueryResult: (tableData: AdaptedDbRowsTable) => void;
  setQueryError: (error: string) => void;
  requestCacheClearConfirmation: () => void;
  cancelCacheClearConfirmation: () => void;
  setCacheClearLoading: () => void;
  setCacheClearResult: (result: ClearDbCacheResponse) => void;
  setCacheClearError: (error: string) => void;
  selectEndpoint: (entryId: string) => void;
  updateEndpointParam: (name: string, value: string | number | boolean | undefined) => void;
  requestRunnerConfirmation: () => void;
  cancelRunnerConfirmation: () => void;
  setRunnerLoading: () => void;
  setRunnerResult: (result: EndpointRunResult) => void;
  setRunnerError: (error: string) => void;
  reset: () => void;
}

export type DeveloperToolsStore = DeveloperToolsState & DeveloperToolsActions;

const initialState: DeveloperToolsState = {
  activeTab: "db",
  dbFilesStatus: "idle",
  tablesStatus: "idle",
  tableDataStatus: "idle",
  searchStatus: "idle",
  queryStatus: "idle",
  cacheStatus: "idle",
  runnerStatus: "idle",
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

export const useDeveloperToolsStore = create<DeveloperToolsStore>((set) => ({
  ...initialState,
  setActiveTab: (activeTab) => set({ activeTab }),
  setDbFilesLoading: () => set({ dbFilesStatus: "loading", dbFilesError: null }),
  setDbFiles: (dbFiles) =>
    set((state) => ({
      dbFiles,
      dbFilesStatus: dbFiles.length > 0 ? "ready" : "empty",
      dbFilesError: null,
      selectedDbFileId:
        state.selectedDbFileId && dbFiles.some((file) => file.id === state.selectedDbFileId)
          ? state.selectedDbFileId
          : dbFiles[0]?.id ?? null,
    })),
  setDbFilesError: (dbFilesError) => set({ dbFilesStatus: "error", dbFilesError }),
  selectDbFile: (selectedDbFileId) =>
    set({
      selectedDbFileId,
      tables: [],
      selectedTable: null,
      tableData: null,
      tablesStatus: "idle",
      tableDataStatus: "idle",
      tablesError: null,
      tableDataError: null,
      tableOffset: 0,
    }),
  setTablesLoading: () => set({ tablesStatus: "loading", tablesError: null }),
  setTables: (tables) =>
    set({
      tables,
      tablesStatus: tables.length > 0 ? "ready" : "empty",
      tablesError: null,
      selectedTable: tables[0] ?? null,
      tableOffset: 0,
    }),
  setTablesError: (tablesError) => set({ tablesStatus: "error", tablesError }),
  selectTable: (selectedTable) =>
    set({ selectedTable, tableData: null, tableDataStatus: "idle", tableDataError: null, tableOffset: 0 }),
  setTableKeyword: (tableKeyword) => set({ tableKeyword, tableOffset: 0 }),
  setTableLimit: (tableLimit) => set({ tableLimit, tableOffset: 0 }),
  setTableOffset: (tableOffset) => set({ tableOffset: Math.max(0, tableOffset), tableData: null, tableDataStatus: "idle" }),
  setTableDataLoading: () => set({ tableDataStatus: "loading", tableDataError: null }),
  setTableData: (tableData) =>
    set({
      tableData,
      tableDataStatus: tableData.rowCount > 0 ? "ready" : "empty",
      tableDataError: null,
    }),
  setTableDataError: (tableDataError) => set({ tableDataStatus: "error", tableDataError }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchMode: (searchMode) => set({ searchMode }),
  setSearchLimit: (searchLimit) => set({ searchLimit }),
  setSearchLoading: () => set({ searchStatus: "loading", searchError: null }),
  setSearchResults: (searchResults) =>
    set({
      searchResults,
      searchStatus: searchResults.items.length > 0 ? "ready" : "empty",
      searchError: null,
    }),
  setSearchError: (searchError) => set({ searchStatus: "error", searchError }),
  setSqlDraft: (sqlDraft) => set({ sqlDraft }),
  setQueryLoading: () => set({ queryStatus: "loading", queryError: null }),
  setQueryResult: (queryResult) =>
    set({
      queryResult,
      queryStatus: queryResult.rowCount > 0 ? "ready" : "empty",
      queryError: null,
    }),
  setQueryError: (queryError) => set({ queryStatus: "error", queryError }),
  requestCacheClearConfirmation: () => set({ cacheConfirmationPending: true, cacheError: null }),
  cancelCacheClearConfirmation: () => set({ cacheConfirmationPending: false }),
  setCacheClearLoading: () => set({ cacheStatus: "loading", cacheError: null }),
  setCacheClearResult: (cacheClearResult) =>
    set({
      cacheClearResult,
      cacheStatus: "ready",
      cacheError: null,
      cacheConfirmationPending: false,
    }),
  setCacheClearError: (cacheError) => set({ cacheStatus: "error", cacheError }),
  selectEndpoint: (selectedEndpointId) =>
    set({ selectedEndpointId, endpointParams: {}, runnerError: null, runnerConfirmationPending: false }),
  updateEndpointParam: (name, value) =>
    set((state) => ({
      endpointParams: {
        ...state.endpointParams,
        [name]: value,
      },
      runnerConfirmationPending: false,
    })),
  requestRunnerConfirmation: () => set({ runnerConfirmationPending: true, runnerError: null }),
  cancelRunnerConfirmation: () => set({ runnerConfirmationPending: false }),
  setRunnerLoading: () => set({ runnerStatus: "loading", runnerError: null, runnerConfirmationPending: false }),
  setRunnerResult: (runnerResult) =>
    set((state) => ({
      runnerResult,
      runnerStatus: "ready",
      runnerError: null,
      runnerConfirmationPending: false,
      runnerHistory: [historyFromResult(runnerResult), ...state.runnerHistory].slice(0, 10),
    })),
  setRunnerError: (runnerError) => set({ runnerStatus: "error", runnerError, runnerConfirmationPending: false }),
  reset: () => set(initialState),
}));

function historyFromResult(result: EndpointRunResult): EndpointRunnerHistoryItem {
  return {
    entryId: result.entryId,
    endpointFamily: result.endpointFamily,
    method: result.method,
    status: result.status,
    durationMs: result.durationMs,
    parameterKeys: [...result.parameterKeys],
    redacted: true,
  };
}
