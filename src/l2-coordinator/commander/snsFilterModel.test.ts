import { describe, expect, it } from "vitest";
import {
  applySnsDraftFilters,
  buildSnsExportScopeSummary,
  buildSnsFilterViewModel,
  clearSnsFilterField,
  validateSnsDraftFilters,
  type SnsAppliedFilters,
  type SnsDraftFilters,
} from "./snsFilterModel";

describe("snsFilterModel", () => {
  it("marks backend-applied and local-only chips without exposing author values in privacy mode", () => {
    const model = buildSnsFilterViewModel({
      appliedFilters: {
        ...appliedFilters(),
        user: "wxid_synthetic_author",
        since: "2026-06-01",
        until: "2026-06-13",
        contentType: "image",
        mediaOnly: true,
        includeRead: true,
      },
      draftFilters: {
        ...draftFilters(),
        user: "wxid_synthetic_author",
        since: "2026-06-01",
        until: "2026-06-13",
        contentType: "image",
        mediaOnly: true,
        includeRead: true,
      },
      dirty: false,
      privacyOn: true,
      activeTab: "timeline",
      loadedCount: 12,
      visibleCount: 4,
      searchQuery: "private keyword",
    });

    expect(model.chips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "user",
          label: "作者",
          value: "已隐藏作者筛选",
          capability: "backend-applied",
          clearable: true,
        }),
        expect.objectContaining({
          id: "contentType",
          label: "类型",
          value: "图片",
          capability: "local-only",
        }),
        expect.objectContaining({
          id: "mediaOnly",
          label: "媒体",
          value: "只看含媒体",
          capability: "local-only",
        }),
        expect.objectContaining({
          id: "includeRead",
          label: "通知",
          value: "包含已读",
          capability: "request-on-apply",
        }),
      ]),
    );
    const visibleCopy = [
      model.summary,
      model.exportScopeSummary,
      ...model.chips.flatMap((chip) => [chip.value, chip.ariaLabel]),
    ].join(" ");
    expect(visibleCopy).not.toContain("wxid_synthetic_author");
    expect(visibleCopy).not.toContain("private keyword");
  });

  it("applies draft filters with request reload only when backend-applied fields change", () => {
    const requestOnly = applySnsDraftFilters({
      ...draftFilters(),
      since: "2026-06-01",
    }, appliedFilters());
    expect(requestOnly.shouldReload).toBe(true);
    expect(requestOnly.changedFields).toEqual(["since"]);

    const localOnly = applySnsDraftFilters({
      ...draftFilters(),
      contentType: "article",
      mediaOnly: true,
    }, appliedFilters());
    expect(localOnly.shouldReload).toBe(false);
    expect(localOnly.shouldRefreshLocal).toBe(true);
    expect(localOnly.changedFields).toEqual(["contentType", "mediaOnly"]);
  });

  it("validates date ranges and clears individual applied fields while preserving limit", () => {
    expect(validateSnsDraftFilters({ ...draftFilters(), since: "2026-06-14", until: "2026-06-01" })).toEqual({
      ok: false,
      message: "开始日期不能晚于结束日期。",
    });

    expect(clearSnsFilterField({
      ...appliedFilters(),
      user: "wxid_synthetic_author",
      contentType: "video",
      mediaOnly: true,
      includeRead: true,
      limit: 150,
    }, "contentType")).toEqual({
      ...appliedFilters(),
      user: "wxid_synthetic_author",
      mediaOnly: true,
      includeRead: true,
      limit: 150,
    });
  });

  it("builds export scope summaries from the current tab, applied filters, and loaded counts", () => {
    expect(buildSnsExportScopeSummary({
      activeTab: "search",
      appliedFilters: {
        ...appliedFilters(),
        contentType: "article",
        mediaOnly: true,
      },
      loadedCount: 20,
      visibleCount: 6,
      searchQuery: "invoice",
      privacyOn: true,
    })).toBe("朋友圈 · 搜索 · 已加载 20 条 · 当前可见 6 条 · 查询 已隐藏查询 · 类型 文章 · 只看含媒体");
  });
});

function appliedFilters(): SnsAppliedFilters {
  return {
    user: "",
    since: "",
    until: "",
    contentType: "all",
    mediaOnly: false,
    includeRead: false,
    limit: 50,
  };
}

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
