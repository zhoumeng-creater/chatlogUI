import { useCallback, useMemo } from "react";
import {
  clearDbCache,
  executeReadOnlyDbQuery,
  fetchDbFiles,
  fetchDbTableData,
  fetchDbTables,
  getEndpointCatalogEntry,
  runEndpointCatalogEntry,
  searchDb,
} from "@l4/network";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useDeveloperToolsStore } from "@l2/data-clerk/stores/useDeveloperToolsStore";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { buildDbExplorerView } from "./dbExplorerViewModel";
import { buildEndpointRunnerView } from "./endpointRunnerViewModel";
import { useHookCommander } from "./useHookCommander";
import { useMcpCommander } from "./useMcpCommander";

const DEVELOPER_CORRELATION_ID = "p4d-developer";

export function useDeveloperToolsCommander() {
  const store = useDeveloperToolsStore();
  const hook = useHookCommander();
  const mcp = useMcpCommander();
  const { loadHook, stopStream } = hook;
  const { loadMcpInventory } = mcp;
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const dbView = useMemo(() => buildDbExplorerView(store, privacyOn), [store, privacyOn]);
  const endpointView = useMemo(() => buildEndpointRunnerView(store, privacyOn), [store, privacyOn]);

  const loadTablesForFile = useCallback(async (fileId: string) => {
    const file = useDeveloperToolsStore.getState().dbFiles.find((item) => item.id === fileId);
    if (!file) return;

    useDeveloperToolsStore.getState().setTablesLoading();
    try {
      const tables = await fetchDbTables(
        { group: file.group, file: file.file },
        createDiagnosticHttpOptions({
          endpointFamily: "db_tables",
          method: "GET",
          correlationId: DEVELOPER_CORRELATION_ID,
          recoveryHint: "retry",
        }),
      );
      useDeveloperToolsStore.getState().setTables(tables);
    } catch {
      useDeveloperToolsStore.getState().setTablesError("加载数据库表失败");
    }
  }, []);

  const loadDeveloperTools = useCallback(async () => {
    const activeTab = useDeveloperToolsStore.getState().activeTab;
    if (activeTab === "hook") {
      await loadHook();
      return;
    }
    if (activeTab === "mcp") {
      loadMcpInventory();
      return;
    }

    useDeveloperToolsStore.getState().setDbFilesLoading();
    try {
      const files = await fetchDbFiles(
        createDiagnosticHttpOptions({
          endpointFamily: "db",
          method: "GET",
          correlationId: DEVELOPER_CORRELATION_ID,
          recoveryHint: "retry",
        }),
      );
      useDeveloperToolsStore.getState().setDbFiles(files);
      const firstFileId = useDeveloperToolsStore.getState().selectedDbFileId;
      if (firstFileId) {
        await loadTablesForFile(firstFileId);
      }
    } catch {
      useDeveloperToolsStore.getState().setDbFilesError("加载数据库文件失败");
    }
  }, [loadHook, loadMcpInventory, loadTablesForFile]);

  const selectDbFile = useCallback(
    (fileId: string | null) => {
      useDeveloperToolsStore.getState().selectDbFile(fileId);
      if (fileId) void loadTablesForFile(fileId);
    },
    [loadTablesForFile],
  );

  const loadTableData = useCallback(async (offsetOverride?: number) => {
    const state = useDeveloperToolsStore.getState();
    const file = selectedFile();
    if (!file || !state.selectedTable) {
      useDeveloperToolsStore.getState().setTableDataError("请选择数据库文件和表");
      return;
    }

    useDeveloperToolsStore.getState().setTableDataLoading();
    try {
      const tableData = await fetchDbTableData(
        {
          group: file.group,
          file: file.file,
          table: state.selectedTable,
          keyword: privacyOn ? undefined : state.tableKeyword || undefined,
          limit: state.tableLimit,
          offset: offsetOverride ?? state.tableOffset,
        },
        createDiagnosticHttpOptions({
          endpointFamily: "db_data",
          method: "GET",
          correlationId: DEVELOPER_CORRELATION_ID,
          recoveryHint: "retry",
        }),
      );
      useDeveloperToolsStore.getState().setTableData(tableData);
    } catch {
      useDeveloperToolsStore.getState().setTableDataError("加载表数据失败");
    }
  }, [privacyOn]);

  const loadPreviousTablePage = useCallback(() => {
    const state = useDeveloperToolsStore.getState();
    const nextOffset = Math.max(0, state.tableOffset - state.tableLimit);
    useDeveloperToolsStore.getState().setTableOffset(nextOffset);
    void loadTableData(nextOffset);
  }, [loadTableData]);

  const loadNextTablePage = useCallback(() => {
    const state = useDeveloperToolsStore.getState();
    const nextOffset = state.tableOffset + state.tableLimit;
    useDeveloperToolsStore.getState().setTableOffset(nextOffset);
    void loadTableData(nextOffset);
  }, [loadTableData]);

  const selectTable = useCallback(
    (table: string | null) => {
      useDeveloperToolsStore.getState().selectTable(table);
      if (table) void loadTableData();
    },
    [loadTableData],
  );

  const runSearch = useCallback(async (query?: string) => {
    const state = useDeveloperToolsStore.getState();
    const keyword = (query ?? state.searchQuery).trim();
    useDeveloperToolsStore.getState().setSearchQuery(keyword);

    if (privacyOn) {
      useDeveloperToolsStore.getState().setSearchError("隐私模式下已隐藏搜索关键词，请关闭隐私模式后搜索。");
      return;
    }

    if (!keyword) {
      useDeveloperToolsStore.getState().setSearchError("请输入数据库搜索关键词");
      return;
    }

    useDeveloperToolsStore.getState().setSearchLoading();
    try {
      const results = await searchDb(
        {
          keyword,
          mode: state.searchMode,
          limit: state.searchLimit,
        },
        createDiagnosticHttpOptions({
          endpointFamily: "db_search",
          method: "GET",
          correlationId: DEVELOPER_CORRELATION_ID,
          recoveryHint: "retry",
        }),
      );
      useDeveloperToolsStore.getState().setSearchResults(results);
    } catch {
      useDeveloperToolsStore.getState().setSearchError("搜索数据库失败");
    }
  }, [privacyOn]);

  const runSqlQuery = useCallback(async () => {
    const state = useDeveloperToolsStore.getState();
    const file = selectedFile();
    if (privacyOn) {
      useDeveloperToolsStore.getState().setQueryError("隐私模式下已隐藏 SQL 草稿，请关闭隐私模式后执行。");
      return;
    }

    if (!file) {
      useDeveloperToolsStore.getState().setQueryError("请选择数据库文件");
      return;
    }

    useDeveloperToolsStore.getState().setQueryLoading();
    try {
      const result = await executeReadOnlyDbQuery(
        {
          group: file.group,
          file: file.file,
          sql: state.sqlDraft,
        },
        createDiagnosticHttpOptions({
          endpointFamily: "db_query",
          method: "GET",
          correlationId: DEVELOPER_CORRELATION_ID,
          recoveryHint: "retry",
        }),
      );
      useDeveloperToolsStore.getState().setQueryResult(result);
    } catch (error) {
      useDeveloperToolsStore.getState().setQueryError(
        error instanceof Error ? error.message : "执行只读 SQL 失败",
      );
    }
  }, [privacyOn]);

  const confirmCacheClear = useCallback(async () => {
    const state = useDeveloperToolsStore.getState();
    if (!state.cacheConfirmationPending) {
      useDeveloperToolsStore.getState().requestCacheClearConfirmation();
      return;
    }

    useDeveloperToolsStore.getState().setCacheClearLoading();
    try {
      const result = await clearDbCache(
        createDiagnosticHttpOptions({
          endpointFamily: "cache_clear",
          method: "POST",
          correlationId: DEVELOPER_CORRELATION_ID,
          recoveryHint: "retry",
        }),
      );
      useDeveloperToolsStore.getState().setCacheClearResult(result);
    } catch {
      useDeveloperToolsStore.getState().setCacheClearError("清理缓存失败");
    }
  }, []);

  const requestRunnerConfirmation = useCallback(() => {
    useDeveloperToolsStore.getState().requestRunnerConfirmation();
  }, []);

  const cancelRunnerConfirmation = useCallback(() => {
    useDeveloperToolsStore.getState().cancelRunnerConfirmation();
  }, []);

  const runEndpoint = useCallback(async (confirmed = false) => {
    const state = useDeveloperToolsStore.getState();
    const selectedEntry = getEndpointCatalogEntry(state.selectedEndpointId);
    if (selectedEntry?.requiresConfirmation && confirmed !== true) {
      useDeveloperToolsStore.getState().requestRunnerConfirmation();
      return;
    }

    useDeveloperToolsStore.getState().setRunnerLoading();
    try {
      const result = await runEndpointCatalogEntry(
        {
          entryId: state.selectedEndpointId,
          params: state.endpointParams,
          confirmed,
        },
        createDiagnosticHttpOptions({
          endpointFamily: selectedEntry?.endpointFamily ?? "api_runner",
          method: selectedEntry?.method ?? "GET",
          correlationId: DEVELOPER_CORRELATION_ID,
          recoveryHint: "retry",
        }),
      );
      useDeveloperToolsStore.getState().setRunnerResult(result);
    } catch (error) {
      useDeveloperToolsStore.getState().setRunnerError(
        error instanceof Error ? error.message : "运行 API 调试请求失败",
      );
    }
  }, []);

  return {
    ...store,
    dbView,
    endpointView,
    hook,
    mcp,
    privacyOn,
    loadDeveloperTools,
    refresh: loadDeveloperTools,
    retry: loadDeveloperTools,
    selectDbFile,
    selectTable,
    loadTableData,
    loadPreviousTablePage,
    loadNextTablePage,
    runSearch,
    runSqlQuery,
    requestCacheClearConfirmation: () => useDeveloperToolsStore.getState().requestCacheClearConfirmation(),
    cancelCacheClearConfirmation: () => useDeveloperToolsStore.getState().cancelCacheClearConfirmation(),
    confirmCacheClear,
    setActiveTab: (tab: typeof store.activeTab) => {
      if (tab !== "hook") stopStream();
      useDeveloperToolsStore.getState().setActiveTab(tab);
      if (tab === "hook") void loadHook();
      if (tab === "mcp") loadMcpInventory();
    },
    selectEndpoint: (entryId: string) => useDeveloperToolsStore.getState().selectEndpoint(entryId),
    updateEndpointParam: (name: string, value: string | number | boolean | undefined) =>
      useDeveloperToolsStore.getState().updateEndpointParam(name, value),
    requestRunnerConfirmation,
    cancelRunnerConfirmation,
    runEndpoint,
  };
}

function selectedFile() {
  const state = useDeveloperToolsStore.getState();
  return state.dbFiles.find((file) => file.id === state.selectedDbFileId) ?? null;
}
