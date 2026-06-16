import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SnsFilterDrawer } from "./SnsFilterDrawer";
import type { SnsDraftFilters } from "@l2/commander/snsFilterModel";

describe("SnsFilterDrawer", () => {
  it("stays out of the reading layout while closed and exposes all draft controls when opened", () => {
    const closed = renderToStaticMarkup(
      <SnsFilterDrawer
        open={false}
        draftFilters={draftFilters()}
        filtersDirty={false}
        filterError={null}
        privacyOn={false}
        onDraftChange={vi.fn()}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(closed).toBe("");

    const opened = renderToStaticMarkup(
      <SnsFilterDrawer
        open
        draftFilters={{ ...draftFilters(), user: "wxid_synthetic_author", contentType: "article", mediaOnly: true }}
        filtersDirty
        filterError="开始日期不能晚于结束日期。"
        privacyOn
        onDraftChange={vi.fn()}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(opened).toContain('role="dialog"');
    expect(opened).toContain('aria-modal="true"');
    expect(opened).toContain("筛选未应用");
    expect(opened).toContain("开始日期不能晚于结束日期。");
    expect(opened).toContain("作者");
    expect(opened).toContain("包含已读通知");
    expect(opened).not.toContain("wxid_synthetic_author");
  });

  it("does not bind privacy masks as editable author values", () => {
    const html = renderToStaticMarkup(
      <SnsFilterDrawer
        open
        draftFilters={{ ...draftFilters(), user: "wxid_synthetic_author" }}
        filtersDirty={false}
        filterError={null}
        privacyOn
        onDraftChange={vi.fn()}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain("已隐藏作者筛选");
    expect(html).toContain("清除作者筛选");
    expect(html).toContain("disabled=\"\"");
    expect(html).not.toContain('value="已隐藏作者筛选"');
    expect(html).not.toContain("wxid_synthetic_author");
  });
});

function draftFilters(): SnsDraftFilters {
  return {
    user: "",
    since: "",
    until: "",
    contentType: "all",
    mediaOnly: false,
    includeRead: false,
  };
}
