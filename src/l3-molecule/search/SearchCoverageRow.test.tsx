import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchCoverageRow } from "./SearchCoverageRow";

describe("SearchCoverageRow", () => {
  it("renders an actionable inline gap only in backend baseline order", () => {
    const html = renderToStaticMarkup(
      <SearchCoverageRow
        mode="gap"
        range={{ start: 50, end: 100 }}
        operation={{ status: "error", errorCode: "timeout" }}
        stale={false}
        errorMessage="搜索超时；不会自动重试，请按需重新提交。"
        onLoad={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(html).toContain("第 51–100 条尚未加载");
    expect(html).toContain("重试加载相邻 50 条");
    expect(html).toContain("搜索超时；不会自动重试，请按需重新提交。");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="listitem"');
  });

  it("turns an in-flight gap action into a visible cancel command", () => {
    const html = renderToStaticMarkup(
      <SearchCoverageRow
        mode="gap"
        range={{ start: 50, end: 100 }}
        operation={{ status: "loading" }}
        stale={false}
        onLoad={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain("正在加载第 51–100 条中的相邻 50 条");
    expect(html).toContain("取消加载相邻 50 条");
    expect(html).not.toContain("disabled");
  });

  it("uses the real remainder when an inline gap is smaller than one batch", () => {
    const html = renderToStaticMarkup(
      <SearchCoverageRow
        mode="gap"
        range={{ start: 50, end: 82 }}
        operation={{ status: "idle" }}
        stale={false}
        onLoad={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain("第 51–82 条尚未加载");
    expect(html).toContain("加载剩余 32 条");
    expect(html).not.toContain("加载相邻 50 条");
    expect(html).not.toContain('aria-live="polite"');
  });

  it("disables an idle gap with an explicit stale-snapshot reason", () => {
    const html = renderToStaticMarkup(
      <SearchCoverageRow
        mode="gap"
        range={{ start: 50, end: 100 }}
        operation={{ status: "idle" }}
        stale
        onLoad={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain("数据已更新，请先刷新后补载这个缺口");
    expect(html).not.toContain("<button");
  });

  it("uses a non-positional coverage summary after local sorting or grouping", () => {
    const html = renderToStaticMarkup(
      <SearchCoverageRow
        mode="coverage"
        loadedRanges={[
          { start: 0, end: 50 },
          { start: 100, end: 125 },
        ]}
        gaps={[
          {
            range: { start: 50, end: 100 },
            operation: { status: "idle" },
            loadAvailable: true,
          },
          {
            range: { start: 125, end: 200 },
            operation: { status: "error", errorCode: "request_failed" },
            loadAvailable: true,
            errorMessage: "搜索请求失败，请重试或查看脱敏诊断。",
          },
        ]}
        totalCount={200}
        activeSourceIndex={110}
        stale={false}
        onLoad={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(html).toContain("已加载第 1–50、101–125 条");
    expect(html).toContain("2 个缺口，共 125 条未加载");
    expect(html).toContain("加载相邻 50 条");
    expect(html).toContain("选择其他缺口");
    expect(html).toContain("第 126–200 条 · 75 条未加载");
    expect(html).toContain("重试加载相邻 50 条");
    expect(html).not.toContain('role="listitem"');
  });

  it("does not render dead coverage commands when no gap has a cursor", () => {
    const html = renderToStaticMarkup(
      <SearchCoverageRow
        mode="coverage"
        loadedRanges={[{ start: 0, end: 50 }]}
        gaps={[
          {
            range: { start: 50, end: 75 },
            operation: { status: "idle" },
            loadAvailable: false,
          },
        ]}
        totalCount={75}
        activeSourceIndex={25}
        stale={false}
        onLoad={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain("1 个缺口，共 25 条未加载");
    expect(html).toContain("当前缺口暂时没有可用加载位置");
    expect(html).not.toContain("<button");
  });

  it("keeps an idle coverage action out of the live region", () => {
    const html = renderToStaticMarkup(
      <SearchCoverageRow
        mode="coverage"
        loadedRanges={[{ start: 0, end: 50 }]}
        gaps={[
          {
            range: { start: 50, end: 75 },
            operation: { status: "idle" },
            loadAvailable: true,
          },
        ]}
        totalCount={75}
        activeSourceIndex={25}
        stale={false}
        onLoad={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain("默认补载距离当前结果最近的缺口");
    expect(html).toContain("加载剩余 25 条");
    expect(html).not.toContain('aria-live="polite"');
    expect(html).not.toContain('role="status"');
  });
});
