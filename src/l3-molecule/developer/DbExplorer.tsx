import { Database, RefreshCw, Trash2 } from "lucide-react";
import { Button, DisabledReason, Input, Select, Spinner, Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";
import type { DbExplorerView } from "@l2/commander/dbExplorerViewModel";
import type { DeveloperToolsLoadStatus } from "@l2/data-clerk/stores/useDeveloperToolsStore";
import { DbSearchPanel } from "./DbSearchPanel";
import { formatDbTableFilterValue, formatDbTableLabel } from "./developerDisplay";
import { ResultTable } from "./ResultTable";
import { SqlQueryPanel } from "./SqlQueryPanel";

interface DbExplorerProps {
  view: DbExplorerView;
  privacyOn: boolean;
  dbFilesStatus: DeveloperToolsLoadStatus;
  tablesStatus: DeveloperToolsLoadStatus;
  tableDataStatus: DeveloperToolsLoadStatus;
  searchStatus: DeveloperToolsLoadStatus;
  queryStatus: DeveloperToolsLoadStatus;
  cacheStatus: DeveloperToolsLoadStatus;
  tableKeyword: string;
  tableLimit: number;
  tableOffset: number;
  searchQuery: string;
  searchMode: "quick" | "deep";
  searchLimit: number;
  sqlDraft: string;
  cacheConfirmationPending: boolean;
  onRefresh: () => void;
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
}

export function DbExplorer({
  view,
  privacyOn,
  dbFilesStatus,
  tablesStatus,
  tableDataStatus,
  searchStatus,
  queryStatus,
  cacheStatus,
  tableKeyword,
  tableLimit,
  tableOffset,
  searchQuery,
  searchMode,
  searchLimit,
  sqlDraft,
  cacheConfirmationPending,
  onRefresh,
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
}: DbExplorerProps) {
  const refreshReason = dbFilesStatus === "loading"
    ? "正在加载数据库文件。完成后可刷新。"
    : undefined;
  const refreshReasonId = refreshReason ? "developer-db-refresh-disabled-reason" : undefined;
  const tableFilterReason = privacyOn
    ? "隐私模式下不可筛选表数据。关闭隐私模式后可继续筛选。"
    : undefined;
  const tableFilterReasonId = tableFilterReason ? "developer-table-filter-privacy-disabled-reason" : undefined;
  const loadTableReason = getLoadTableReason(view.selectedTable, tableDataStatus);
  const loadTableReasonId = loadTableReason ? "developer-table-load-disabled-reason" : undefined;
  const previousPageReason = getTablePagerReason("previous", {
    tableOffset,
    tableLimit,
    rowCount: view.tableData.rowCount,
    selectedTable: view.selectedTable,
    status: tableDataStatus,
  });
  const nextPageReason = getTablePagerReason("next", {
    tableOffset,
    tableLimit,
    rowCount: view.tableData.rowCount,
    selectedTable: view.selectedTable,
    status: tableDataStatus,
  });
  const previousPageReasonId = previousPageReason ? "developer-table-previous-disabled-reason" : undefined;
  const nextPageReasonId = nextPageReason ? "developer-table-next-disabled-reason" : undefined;
  const cacheReason = cacheStatus === "loading" ? "正在清理缓存。完成后可再次提交。" : undefined;
  const cacheReasonId = cacheReason ? "developer-cache-clear-disabled-reason" : undefined;

  return (
    <div className="developer-db">
      <section className="developer-section developer-section--top" aria-label="数据库文件和表">
        <div className="developer-section__header">
          <div>
            <Typography variant="label" weight={700}>
              DB Explorer
            </Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {view.dbSummary}
            </Typography>
          </div>
          {refreshReason ? (
            <DisabledReason id={refreshReasonId} reason={refreshReason} variant="compact">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={dbFilesStatus === "loading"}
                aria-describedby={refreshReasonId}
                aria-label="刷新数据库文件"
              >
                <RefreshCw size={14} />
              </Button>
            </DisabledReason>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={dbFilesStatus === "loading"}
              aria-describedby={refreshReasonId}
              aria-label="刷新数据库文件"
            >
              <RefreshCw size={14} />
            </Button>
          )}
        </div>
        <div className="developer-db__browser">
          <div className="developer-list" aria-label="数据库文件">
            {dbFilesStatus === "loading" && <Spinner size={16} label="加载数据库文件..." color="var(--text-muted)" />}
            {view.files.length === 0 ? (
              <Typography variant="caption" color="var(--text-secondary)">
                暂无数据库文件。
              </Typography>
            ) : (
              view.files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className={classNames(
                    "developer-list-row",
                    file.id === view.selectedFile?.id && "developer-list-row--active",
                  )}
                  onClick={() => onSelectDbFile(file.id)}
                >
                  <Database size={14} />
                  <span>{file.displayName}</span>
                  <small>{file.category}</small>
                </button>
              ))
            )}
          </div>
          <div className="developer-list" aria-label="数据库表">
            {tablesStatus === "loading" && <Spinner size={16} label="加载数据库表..." color="var(--text-muted)" />}
            {view.tables.length === 0 ? (
              <Typography variant="caption" color="var(--text-secondary)">
                选择数据库文件后加载表。
              </Typography>
            ) : (
              view.tables.map((table) => (
                <button
                  key={table}
                  type="button"
                  className={classNames(
                    "developer-list-row",
                    "developer-list-row--table",
                    table === view.selectedTable && "developer-list-row--active",
                  )}
                  onClick={() => onSelectTable(table)}
                >
                  <span>{formatDbTableLabel(table, privacyOn)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="developer-section" aria-label="表数据">
        <div className="developer-section__header">
          <Typography variant="label" weight={700}>
            Table Data
          </Typography>
          {tableDataStatus === "loading" && <Spinner size={15} label="加载表数据..." color="var(--text-muted)" />}
        </div>
        <div className="developer-form-row">
          <Input
            controlSize="sm"
            value={formatDbTableFilterValue(tableKeyword, privacyOn)}
            onChange={(event) => onTableKeywordChange(event.currentTarget.value)}
            placeholder={privacyOn ? "隐私模式已隐藏关键词" : "keyword"}
            aria-label="表数据关键词"
            disabled={privacyOn}
            aria-describedby={tableFilterReasonId}
          />
          <Select
            controlSize="sm"
            value={tableLimit}
            onChange={(event) => onTableLimitChange(Number(event.currentTarget.value))}
            aria-label="表数据条数"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </Select>
          {loadTableReason ? (
            <DisabledReason id={loadTableReasonId} reason={loadTableReason} variant="compact">
              <Button
                variant="secondary"
                size="sm"
                onClick={onLoadTableData}
                disabled={!view.selectedTable || tableDataStatus === "loading"}
                aria-describedby={loadTableReasonId}
              >
                加载
              </Button>
            </DisabledReason>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={onLoadTableData}
              disabled={!view.selectedTable || tableDataStatus === "loading"}
              aria-describedby={loadTableReasonId}
            >
              加载
            </Button>
          )}
        </div>
        {tableFilterReason && (
          <DisabledReason id={tableFilterReasonId} reason={tableFilterReason} variant="compact" />
        )}
        {view.tableData.rowCount > 0 && (
          <div className="developer-pager">
            <Typography variant="caption" color="var(--text-secondary)">
              {view.tableData.rowCount.toLocaleString()} 行 · {view.tableData.columnCount.toLocaleString()} 列 · offset{" "}
              {tableOffset.toLocaleString()}
            </Typography>
            <div className="developer-pager__actions">
              {previousPageReason ? (
                <DisabledReason id={previousPageReasonId} reason={previousPageReason} variant="compact">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadPreviousTablePage}
                    disabled={tableOffset <= 0 || tableDataStatus === "loading"}
                    aria-describedby={previousPageReasonId}
                  >
                    上一页
                  </Button>
                </DisabledReason>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadPreviousTablePage}
                  disabled={tableOffset <= 0 || tableDataStatus === "loading"}
                  aria-describedby={previousPageReasonId}
                >
                  上一页
                </Button>
              )}
              {nextPageReason ? (
                <DisabledReason id={nextPageReasonId} reason={nextPageReason} variant="compact">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadNextTablePage}
                    disabled={!view.selectedTable || view.tableData.rowCount < tableLimit || tableDataStatus === "loading"}
                    aria-describedby={nextPageReasonId}
                  >
                    下一页
                  </Button>
                </DisabledReason>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadNextTablePage}
                  disabled={!view.selectedTable || view.tableData.rowCount < tableLimit || tableDataStatus === "loading"}
                  aria-describedby={nextPageReasonId}
                >
                  下一页
                </Button>
              )}
            </div>
          </div>
        )}
        <ResultTable table={view.tableData} emptyCopy="选择表后加载数据。" />
      </section>

      <DbSearchPanel
        status={searchStatus}
        query={searchQuery}
        mode={searchMode}
        limit={searchLimit}
        privacyOn={privacyOn}
        results={view.searchResults}
        error={view.errorCopy}
        onQueryChange={onSearchQueryChange}
        onModeChange={onSearchModeChange}
        onLimitChange={onSearchLimitChange}
        onSearch={onSearch}
      />

      <SqlQueryPanel
        status={queryStatus}
        sqlDraft={sqlDraft}
        privacyOn={privacyOn}
        result={view.queryResult}
        error={view.errorCopy}
        guard={view.sqlClassification}
        canRun={view.canRunQuery}
        onSqlDraftChange={onSqlDraftChange}
        onRun={onRunSqlQuery}
      />

      <section className="developer-section developer-cache" aria-label="缓存清理">
        <div>
          <Typography variant="label" weight={700}>
            Cache
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.cacheSummary}
          </Typography>
        </div>
        <div className="developer-cache__actions">
          {cacheConfirmationPending && (
            <Button variant="ghost" size="sm" onClick={onCancelCacheClearConfirmation}>
              取消
            </Button>
          )}
          {cacheReason ? (
            <DisabledReason id={cacheReasonId} reason={cacheReason} variant="compact">
              <Button
                variant={cacheConfirmationPending ? "danger" : "secondary"}
                size="sm"
                loading={cacheStatus === "loading"}
                aria-describedby={cacheReasonId}
                onClick={cacheConfirmationPending ? onConfirmCacheClear : onRequestCacheClearConfirmation}
              >
                <Trash2 size={14} />
                {cacheConfirmationPending ? "确认清理缓存" : "清理缓存"}
              </Button>
            </DisabledReason>
          ) : (
            <Button
              variant={cacheConfirmationPending ? "danger" : "secondary"}
              size="sm"
              loading={cacheStatus === "loading"}
              aria-describedby={cacheReasonId}
              onClick={cacheConfirmationPending ? onConfirmCacheClear : onRequestCacheClearConfirmation}
            >
              <Trash2 size={14} />
              {cacheConfirmationPending ? "确认清理缓存" : "清理缓存"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function getLoadTableReason(
  selectedTable: string | null,
  status: DeveloperToolsLoadStatus,
): string | undefined {
  if (status === "loading") return "正在加载表数据。完成后可再次加载。";
  if (!selectedTable) return "请先选择数据库表。选择表后可加载数据。";
  return undefined;
}

function getTablePagerReason(
  direction: "previous" | "next",
  {
    tableOffset,
    tableLimit,
    rowCount,
    selectedTable,
    status,
  }: {
    tableOffset: number;
    tableLimit: number;
    rowCount: number;
    selectedTable: string | null;
    status: DeveloperToolsLoadStatus;
  },
): string | undefined {
  if (status === "loading") return "正在加载表数据。完成后可翻页。";
  if (!selectedTable) return "请先选择数据库表。";
  if (direction === "previous") return tableOffset <= 0 ? "当前已经是第一页。" : undefined;
  return rowCount < tableLimit ? "当前没有下一页。" : undefined;
}
