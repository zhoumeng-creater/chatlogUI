import { describe, expect, it } from "vitest";
import {
  clearSearchDraftCondition,
  createDefaultSearchDraft,
  getSearchDraftChange,
  normalizeSearchKeyword,
  replaceSearchDraftScope,
  toggleSearchDraftDirectorySelection,
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

  it("matches Go default case folding without merging dotless i into ASCII i", () => {
    expect(normalizeSearchKeyword("I i ı Straße STRASSE")).toMatchObject({
      displayKeyword: "I i ı Straße STRASSE",
      uniqueDisplayTerms: ["I", "ı", "Straße"],
      canonicalTerms: ["i", "strasse", "ı"],
      termCount: 3,
    });

    expect(normalizeSearchKeyword("Ꭰ ꭰ ΟΣ ος")).toMatchObject({
      uniqueDisplayTerms: ["Ꭰ", "ꭰ", "ΟΣ"],
      canonicalTerms: ["οσ", "Ꭰ", "ꭰ"],
      termCount: 3,
    });

    for (const backendIdentity of [
      "\u1c89",
      "\ua7cb",
      "\ua7cc",
      "\ua7da",
      "\ua7dc",
      "\u{10d50}",
      "\u{10d65}",
    ]) {
      expect(normalizeSearchKeyword(backendIdentity).canonicalTerms).toEqual([backendIdentity]);
    }
  });

  it("applies case-fold deduplication before the 20-term boundary", () => {
    const eighteenTerms = Array.from({ length: 18 }, (_, index) => `term${index}`);
    const atLimit = validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: [...eighteenTerms, "I", "i", "Straße", "STRASSE"].join(" "),
    });
    expect(atLimit.normalized.termCount).toBe(20);
    expect(atLimit.errors.keyword).toBeUndefined();

    const overLimit = validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: [...eighteenTerms, "I", "i", "ı", "Straße", "STRASSE"].join(" "),
    });
    expect(overLimit.normalized.termCount).toBe(21);
    expect(overLimit.errors.keyword).toBe("关键词最多 20 个词项");
  });

  it("counts grapheme clusters and rejects more than 200 unique-term graphemes or 20 terms", () => {
    const family = "👨‍👩‍👧‍👦";
    const belowLimit = validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: family.repeat(199),
    });
    expect(belowLimit.errors.keyword).toBeUndefined();
    expect(belowLimit.normalized.graphemeCount).toBe(199);

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
    expect(validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: family.repeat(201).slice(0, -family.length),
    }).errors.keyword).toBeUndefined();

    const tooManyTerms = validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: Array.from({ length: 21 }, (_, index) => `term${index}`).join(" "),
    });
    expect(tooManyTerms.errors.keyword).toBe("关键词最多 20 个词项");
    const fullWidthSpaces = validateSearchDraft({
      ...createDefaultSearchDraft(),
      keyword: Array.from({ length: 20 }, (_, index) => `term${index}`).join("\u3000"),
    });
    expect(fullWidthSpaces.errors.keyword).toBeUndefined();
    expect(fullWidthSpaces.normalized.termCount).toBe(20);

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
    }).errors.scope).toBe("无法确定当前会话，请选择会话或切换到全部会话");

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

  it("clears scope, type, sender, and date through independent condition actions", () => {
    const draft: SearchDraft = {
      keyword: "needle",
      scope: { kind: "selected", chatIds: ["chat-a"] },
      categories: ["file"],
      senderIds: ["sender-a"],
      dateRange: { start: "2026-07-01", end: "2026-07-15" },
    };

    expect(clearSearchDraftCondition(draft, "scope")).toEqual({
      ...draft,
      scope: { kind: "all" },
      senderIds: [],
    });
    expect(clearSearchDraftCondition(draft, "categories")).toEqual({
      ...draft,
      categories: [],
    });
    expect(clearSearchDraftCondition(draft, "senders")).toEqual({
      ...draft,
      senderIds: [],
    });
    expect(clearSearchDraftCondition(draft, "dates")).toEqual({
      ...draft,
      dateRange: {},
    });

    const alreadyAll = { ...draft, scope: { kind: "all" } as const };
    expect(clearSearchDraftCondition(alreadyAll, "scope").senderIds).toEqual(["sender-a"]);
  });

  it("uses draft selected ids as the directory-selection truth", () => {
    const draft: SearchDraft = {
      ...createDefaultSearchDraft(),
      scope: { kind: "selected", chatIds: ["alice"] },
      senderIds: ["sender-alice"],
    };

    expect(toggleSearchDraftDirectorySelection(draft, "conversation", "alice")).toMatchObject({
      scope: { kind: "all" },
      senderIds: [],
    });
    expect(toggleSearchDraftDirectorySelection(draft, "conversation", "bob")).toMatchObject({
      scope: { kind: "selected", chatIds: ["alice", "bob"] },
      senderIds: [],
    });
    expect(toggleSearchDraftDirectorySelection(draft, "sender", "sender-alice")).toMatchObject({
      scope: { kind: "selected", chatIds: ["alice"] },
      senderIds: [],
    });
    expect(toggleSearchDraftDirectorySelection(draft, "sender", "sender-bob")).toMatchObject({
      senderIds: ["sender-alice", "sender-bob"],
    });

    const sameSelection: SearchDraft = {
      ...draft,
      scope: { kind: "selected", chatIds: ["alice", "bob"] },
    };
    expect(replaceSearchDraftScope(sameSelection, {
      kind: "selected",
      chatIds: ["bob", "alice", "alice"],
    }).senderIds).toEqual(["sender-alice"]);
  });
});
