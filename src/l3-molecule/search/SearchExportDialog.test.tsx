import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SearchExportCommanderView } from "@l2/commander/useSearchExportCommander";
import { SearchExportDialog } from "./SearchExportDialog";

describe("SearchExportDialog", () => {
  it("defaults to all hits, exposes the honest partial scope, and never renders private snapshot facts", () => {
    const html = renderToStaticMarkup(<SearchExportDialog view={view()} />);

    expect(html).toContain("冻结搜索快照");
    expect(html).toContain("全部命中");
    expect(html).toContain("后端基线顺序");
    expect(html).toContain("当前已加载 50 条");
    expect(html).toContain("覆盖 1 个已加载区间");
    expect(html).toContain('name="search-export-scope" checked=""');
    expect(html).toContain("Markdown");
    expect(html).toContain("CSV");
    expect(html).toContain("JSON");
    expect(html).not.toContain("PRIVATE keyword");
    expect(html).not.toContain("PRIVATE conversation");
  });

  it("shows bounded progress and keeps an explicit cancel recovery during native finalization", () => {
    const running = view();
    running.task = {
      taskId: "task-1",
      dialog: running.dialog!,
      selection: running.selection!,
      scope: "all",
      status: "finalizing",
      attempt: 1,
      attemptId: "attempt-1",
      processedCount: 12,
      totalCount: 12,
      nextCursor: null,
      error: null,
    };
    const html = renderToStaticMarkup(<SearchExportDialog view={running} />);

    expect(html).toContain("正在完成文件写入");
    expect(html).toContain('value="12"');
    expect(html).toContain('max="12"');
    expect(html).toContain("取消导出");
    expect(html).not.toContain(">正在完成</button>");
  });

  it("locks cancellation once native commit has started", () => {
    const committing = view();
    committing.commitInFlight = true;
    committing.task = {
      taskId: "task-1",
      dialog: committing.dialog!,
      selection: committing.selection!,
      scope: "all",
      status: "finalizing",
      attempt: 1,
      attemptId: "attempt-1",
      processedCount: 12,
      totalCount: 12,
      nextCursor: null,
      error: null,
    };

    const html = renderToStaticMarkup(<SearchExportDialog view={committing} />);

    expect(html).toContain("正在提交");
    expect(html).toContain('disabled=""');
    expect(html).not.toContain("取消导出");
  });

  it("locks the frozen selection after an export error so retry cannot imply edited settings", () => {
    const failed = view();
    failed.task = {
      taskId: "task-1",
      dialog: failed.dialog!,
      selection: failed.selection!,
      scope: "all",
      status: "error",
      attempt: 1,
      attemptId: null,
      processedCount: 12,
      totalCount: 132,
      nextCursor: "cursor-private",
      error: {
        code: "request_failed",
        message: "导出请求失败，请重试。",
        retryable: true,
        checkpointSafe: true,
      },
    };
    const html = renderToStaticMarkup(<SearchExportDialog view={failed} />);

    expect(html.match(/<fieldset disabled=""/g)).toHaveLength(2);
    expect(html).toContain("重试");
    expect(html).not.toContain("开始导出");
    expect(html).not.toContain("cursor-private");
  });

  it("shows a path-free retry state when native commit confirmation is interrupted", () => {
    const pending = view();
    pending.result = {
      fileName: "chatlog-search.json",
      extension: "json",
      bytesWritten: 12,
      locationSummary: "已保存到所选位置",
    };
    pending.task = {
      taskId: "task-1",
      dialog: pending.dialog!,
      selection: pending.selection!,
      scope: "all",
      status: "commit_pending",
      attempt: 1,
      attemptId: "attempt-1",
      processedCount: 12,
      totalCount: 12,
      nextCursor: null,
      error: {
        code: "commit_confirmation_interrupted",
        message: "文件已写入，但提交确认中断。请重试确认保存结果。",
        retryable: true,
        checkpointSafe: false,
      },
    };

    const html = renderToStaticMarkup(<SearchExportDialog view={pending} />);

    expect(html).toContain("提交确认中断");
    expect(html).toContain("请重试确认保存结果");
    expect(html).toContain("重试确认");
    expect(html).toContain('data-close-on-backdrop="false"');
    expect(html).toContain('data-close-on-escape="false"');
    expect(html).not.toContain("取消导出");
    expect(html).not.toContain(">关闭</button>");
    expect(html).not.toMatch(/Users|PRIVATE|[A-Z]:\\/i);
  });
});

function view(): SearchExportCommanderView {
  return {
    isOpen: true,
    confirmThreshold: 10_000,
    dialog: {
      applied: {
        draft: {
          keyword: "PRIVATE keyword",
          scope: { kind: "current", chatId: "PRIVATE conversation" },
          categories: [],
          senderIds: [],
          dateRange: {},
        },
        request: { keyword: "PRIVATE keyword", chats: ["PRIVATE conversation"] },
        succeededAt: 1,
      },
      snapshotId: "PRIVATE snapshot",
      dataRevision: "PRIVATE revision",
      totalCount: 132,
      browseMode: "manual",
      sortMode: "newest",
      groupingMode: "none",
      format: "markdown",
      privacyOn: false,
      stale: false,
      locale: "zh-CN",
      timeZone: "Asia/Shanghai",
      openedAt: 1,
      defaultScope: "all",
      partial: {
        kind: "retained_ranges",
        rangeCount: 1,
        gapCount: 1,
        unloadedCount: 82,
        count: 50,
        label: "当前已加载 50 条",
      },
      all: { allowed: true, count: 132, unavailableReason: null },
      publicSummary: {
        totalLabel: "共 132 条命中",
        partialLabel: "当前已加载 50 条",
        coverageLabel: "已加载 50 条，另有 82 条尚未加载",
        defaultScopeLabel: "全部命中",
        privacyOn: false,
      },
    },
    selection: { scope: "all", unredactedConfirmed: false },
    task: null,
    commitInFlight: false,
    confirmationRequired: false,
    result: null,
    openDialog: vi.fn(() => true),
    setFormat: vi.fn(() => true),
    selectScope: vi.fn(() => true),
    setUnredactedConfirmed: vi.fn(() => true),
    confirm: vi.fn(async () => true),
    retry: vi.fn(async () => true),
    cancel: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
}
