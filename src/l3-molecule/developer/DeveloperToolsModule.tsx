import { RefreshCw } from "lucide-react";
import { Button, SegmentedControl, Typography } from "@l4/ui";
import type { HermesQQDraft, HermesWeixinDraft, HookConfigDraft, HookConfigView } from "@l4/network";
import type { DbExplorerView } from "@l2/commander/dbExplorerViewModel";
import type { EndpointRunnerView } from "@l2/commander/endpointRunnerViewModel";
import type { HookView } from "@l2/commander/hookViewModel";
import type { McpView } from "@l2/commander/mcpViewModel";
import type {
  DeveloperToolsActiveTab,
  DeveloperToolsLoadStatus,
} from "@l2/data-clerk/stores/useDeveloperToolsStore";
import type { HookSubtab } from "@l2/data-clerk/stores/useHookStore";
import { DbExplorer } from "./DbExplorer";
import { EndpointRunner } from "./EndpointRunner";
import { HookConsole } from "./HookConsole";
import { McpPanel } from "./McpPanel";

interface DeveloperToolsModuleProps {
  dbView: DbExplorerView;
  endpointView: EndpointRunnerView;
  hookView: HookView;
  hookConfig: HookConfigView | null;
  mcpView: McpView;
  activeTab: DeveloperToolsActiveTab;
  privacyOn: boolean;
  dbFilesStatus: DeveloperToolsLoadStatus;
  tablesStatus: DeveloperToolsLoadStatus;
  tableDataStatus: DeveloperToolsLoadStatus;
  searchStatus: DeveloperToolsLoadStatus;
  queryStatus: DeveloperToolsLoadStatus;
  cacheStatus: DeveloperToolsLoadStatus;
  runnerStatus: DeveloperToolsLoadStatus;
  tableKeyword: string;
  tableLimit: number;
  tableOffset: number;
  searchQuery: string;
  searchMode: "quick" | "deep";
  searchLimit: number;
  sqlDraft: string;
  cacheConfirmationPending: boolean;
  selectedEndpointId: string;
  endpointParams: Record<string, string | number | boolean | undefined>;
  runnerConfirmationPending: boolean;
  hookClearConfirmationPending: boolean;
  onRefresh: () => void;
  onTabChange: (tab: DeveloperToolsActiveTab) => void;
  onSelectDbFile: (fileId: string | null) => void;
  onSelectTable: (table: string | null) => void;
  onTableKeywordChange: (keyword: string) => void;
  onTableLimitChange: (limit: number) => void;
  onLoadPreviousTablePage: () => void;
  onLoadNextTablePage: () => void;
  onLoadTableData: () => void;
  onSearchQueryChange: (query: string) => void;
  onSearchModeChange: (mode: "quick" | "deep") => void;
  onSearchLimitChange: (limit: number) => void;
  onSearch: () => void;
  onSqlDraftChange: (sql: string) => void;
  onRunSqlQuery: () => void;
  onRequestCacheClearConfirmation: () => void;
  onCancelCacheClearConfirmation: () => void;
  onConfirmCacheClear: () => void;
  onSelectEndpoint: (entryId: string) => void;
  onEndpointParamChange: (name: string, value: string | number | boolean | undefined) => void;
  onRequestRunnerConfirmation: () => void;
  onCancelRunnerConfirmation: () => void;
  onRunEndpoint: (confirmed?: boolean) => void;
  onHookSubtabChange: (tab: HookSubtab) => void;
  onHookSaveConfig: (draft: Partial<HookConfigDraft> & Pick<HookConfigDraft, "notifyTargets">) => void;
  onHookRefreshHermes: () => void;
  onHookSaveHermesWeixin: (draft: HermesWeixinDraft) => void;
  onHookSaveHermesQQ: (draft: HermesQQDraft) => void;
  onHookStartStream: () => void;
  onHookStopStream: () => void;
  onHookConfirmClear: () => void;
  onHookCancelClear: () => void;
  onMcpRefresh: () => void;
  onMcpSmoke: () => void;
}

export function DeveloperToolsModule({
  dbView,
  endpointView,
  hookView,
  hookConfig,
  mcpView,
  activeTab,
  privacyOn,
  dbFilesStatus,
  tablesStatus,
  tableDataStatus,
  searchStatus,
  queryStatus,
  cacheStatus,
  runnerStatus,
  tableKeyword,
  tableLimit,
  tableOffset,
  searchQuery,
  searchMode,
  searchLimit,
  sqlDraft,
  cacheConfirmationPending,
  selectedEndpointId,
  endpointParams,
  runnerConfirmationPending,
  hookClearConfirmationPending,
  onRefresh,
  onTabChange,
  onSelectDbFile,
  onSelectTable,
  onTableKeywordChange,
  onTableLimitChange,
  onLoadPreviousTablePage,
  onLoadNextTablePage,
  onLoadTableData,
  onSearchQueryChange,
  onSearchModeChange,
  onSearchLimitChange,
  onSearch,
  onSqlDraftChange,
  onRunSqlQuery,
  onRequestCacheClearConfirmation,
  onCancelCacheClearConfirmation,
  onConfirmCacheClear,
  onSelectEndpoint,
  onEndpointParamChange,
  onRequestRunnerConfirmation,
  onCancelRunnerConfirmation,
  onRunEndpoint,
  onHookSubtabChange,
  onHookSaveConfig,
  onHookRefreshHermes,
  onHookSaveHermesWeixin,
  onHookSaveHermesQQ,
  onHookStartStream,
  onHookStopStream,
  onHookConfirmClear,
  onHookCancelClear,
  onMcpRefresh,
  onMcpSmoke,
}: DeveloperToolsModuleProps) {
  const subtitle =
    activeTab === "db"
      ? dbView.subtitle
      : activeTab === "api"
        ? "wx-cli/API allowlist debugger"
        : activeTab === "hook"
          ? "Hook 配置、事件流与 Hermes 桥接"
          : "MCP 本机路由、工具与 Prompt 清单";

  return (
    <aside className="developer-tools" aria-label="开发者工具">
      <div className="developer-tools__header">
        <div>
          <Typography variant="label" weight={700}>
            {dbView.title}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {subtitle}
          </Typography>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={dbFilesStatus === "loading"}
          aria-label="刷新开发者工具"
        >
          <RefreshCw size={14} />
        </Button>
      </div>

      <SegmentedControl
        label="开发者工具视图"
        value={activeTab}
        onChange={onTabChange}
        options={[
          { value: "db", label: "DB Explorer" },
          { value: "api", label: "API Runner" },
          { value: "hook", label: "Hook" },
          { value: "mcp", label: "MCP" },
        ]}
      />

      {activeTab === "db" && (
        <DbExplorer
          view={dbView}
          privacyOn={privacyOn}
          dbFilesStatus={dbFilesStatus}
          tablesStatus={tablesStatus}
          tableDataStatus={tableDataStatus}
          searchStatus={searchStatus}
          queryStatus={queryStatus}
          cacheStatus={cacheStatus}
          tableKeyword={tableKeyword}
          tableLimit={tableLimit}
          tableOffset={tableOffset}
          searchQuery={searchQuery}
          searchMode={searchMode}
          searchLimit={searchLimit}
          sqlDraft={sqlDraft}
          cacheConfirmationPending={cacheConfirmationPending}
          onRefresh={onRefresh}
          onSelectDbFile={onSelectDbFile}
          onSelectTable={onSelectTable}
          onTableKeywordChange={onTableKeywordChange}
          onTableLimitChange={onTableLimitChange}
          onLoadPreviousTablePage={onLoadPreviousTablePage}
          onLoadNextTablePage={onLoadNextTablePage}
          onLoadTableData={onLoadTableData}
          onSearchQueryChange={onSearchQueryChange}
          onSearchModeChange={onSearchModeChange}
          onSearchLimitChange={onSearchLimitChange}
          onSearch={onSearch}
          onSqlDraftChange={onSqlDraftChange}
          onRunSqlQuery={onRunSqlQuery}
          onRequestCacheClearConfirmation={onRequestCacheClearConfirmation}
          onCancelCacheClearConfirmation={onCancelCacheClearConfirmation}
          onConfirmCacheClear={onConfirmCacheClear}
        />
      )}
      {activeTab === "api" && (
        <EndpointRunner
          view={endpointView}
          selectedEndpointId={selectedEndpointId}
          endpointParams={endpointParams}
          status={runnerStatus}
          privacyOn={privacyOn}
          confirmationPending={runnerConfirmationPending}
          onSelectEndpoint={onSelectEndpoint}
          onParamChange={onEndpointParamChange}
          onRequestConfirmation={onRequestRunnerConfirmation}
          onCancelConfirmation={onCancelRunnerConfirmation}
          onRun={onRunEndpoint}
        />
      )}
      {activeTab === "hook" && (
        <HookConsole
          view={hookView}
          config={hookConfig}
          privacyOn={privacyOn}
          clearConfirmationPending={hookClearConfirmationPending}
          onSubtabChange={onHookSubtabChange}
          onSaveConfig={onHookSaveConfig}
          onRefreshHermes={onHookRefreshHermes}
          onSaveHermesWeixin={onHookSaveHermesWeixin}
          onSaveHermesQQ={onHookSaveHermesQQ}
          onStartStream={onHookStartStream}
          onStopStream={onHookStopStream}
          onConfirmClear={onHookConfirmClear}
          onCancelClear={onHookCancelClear}
        />
      )}
      {activeTab === "mcp" && (
        <McpPanel
          view={mcpView}
          onRefresh={onMcpRefresh}
          onSmoke={onMcpSmoke}
        />
      )}
    </aside>
  );
}
