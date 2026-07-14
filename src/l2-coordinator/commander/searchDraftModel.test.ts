import { describe, expect, it } from "vitest";
import {
  createDefaultSearchDraft,
  getSearchDraftChange,
  normalizeSearchKeyword,
  validateSearchDraft,
  type SearchDraft,
} from "./searchDraftModel";

describe("searchDraftModel", () => {
  it("normalizes NFKC and whitespace while deduplicating case-fold equivalent terms", () => {
    expect(normalizeSearchKeyword("  Ｆｏｏ   BAR  Straße STRASSE ")).toMatchObject({
      displayKeyword: "Foo BAR Straße STRASSE",
      uniqueDisplayTerms: ["Foo", "BAR", "Straße"],
      canonicalTerms: ["bar", "foo", "strasse"],
      graphemeCount: 14,
      termCount: 3,
    });
  });

  it("counts grapheme clusters and rejects more than 200 unique-term graphemes or 20 terms", () => {
    const family = "👨‍👩‍👧‍👦";
    const valid = validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: family.repeat(200),
    });
    expect(valid.errors.keyword).toBeUndefined();
    expect(valid.normalized.graphemeCount).toBe(200);

    const tooLong = validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: family.repeat(201),
    });
    expect(tooLong.errors.keyword).toBe("关键词最多 200 个字符");

    const tooManyTerms = validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: Array.from({ length: 21 }, (_, index) => `term${index}`).join(" "),
    });
    expect(tooManyTerms.errors.keyword).toBe("关键词最多 20 个词项");

    const duplicates = validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: Array.from({ length: 30 }, () => "Ｓａｍｅ").join(" "),
    });
    expect(duplicates.errors.keyword).toBeUndefined();
    expect(duplicates.normalized.termCount).toBe(1);
  });

  it("fails closed for unresolved current scope, empty selected scope, invalid sender, and date errors", () => {
    expect(validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: "needle",
      scope: { kind: "current", chatId: null },
    }).errors.scope).toBe("当前会话不可用，请重新选择搜索范围");

    expect(validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: "needle",
      scope: { kind: "selected", chatIds: [] },
    }).errors.scope).toBe("请至少选择一个会话");

    expect(validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: "needle",
      senderIds: [""],
    }).errors.senders).toBe("发送者筛选无效，请重新选择");

    expect(validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: "needle",
      dateRange: { start: "2026-07-15", end: "2026-07-14" },
    }).errors.dateRange).toBe("开始日期不能晚于结束日期");
  });

  it("canonicalizes unordered multi-select filters without mutating the draft", () => {
    const draft: SearchDraft = {
      keyword: "needle",
      scope: { kind: "selected", chatIds: ["b", "a", "a"] },
      categories: ["file", "text", "file"],
      senderIds: ["sender-b", "sender-a", "sender-a"],
      dateRange: {},
    };
    const result = validateSearchDraft(draft);
    expect(result.valid).toBe(true);
    expect(result.value).toMatchObject({
      scope: { kind: "selected", chatIds: ["a", "b"] },
      categories: ["file", "text"],
      senderIds: ["sender-a", "sender-b"],
    });
    expect(draft.scope).toEqual({ kind: "selected", chatIds: ["b", "a", "a"] });
  });

  it("distinguishes keyword and filter dirtiness for the single submit action", () => {
    const applied = {
      ...createDefaultSearchDraft(),
      keyword: "needle",
    };
    expect(getSearchDraftChange(applied, null)).toEqual({
      dirtySources: ["keyword", "scope", "categories", "senders", "dates"],
      submitLabel: "搜索",
    });
    expect(getSearchDraftChange({ ...applied, keyword: "other" }, applied)).toEqual({
      dirtySources: ["keyword"],
      submitLabel: "搜索",
    });
    expect(getSearchDraftChange({ ...applied, categories: ["file"] }, applied)).toEqual({
      dirtySources: ["categories"],
      submitLabel: "应用筛选",
    });
    expect(getSearchDraftChange(applied, applied)).toEqual({
      dirtySources: [],
      submitLabel: "搜索",
    });
  });
});
