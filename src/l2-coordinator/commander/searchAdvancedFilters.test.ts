import { describe, expect, it } from "vitest";
import {
  buildSearchAdvancedFilterChips,
  createDefaultSearchAdvancedFilters,
  mapSearchAdvancedFiltersToRequest,
  resolveSearchFilterCapabilities,
} from "./searchAdvancedFilters";

describe("searchAdvancedFilters", () => {
  it("maps supported date and selected chat filters to safe backend request params", () => {
    const filters = {
      ...createDefaultSearchAdvancedFilters(),
      dateRange: { start: "2026-01-02", end: "2026-01-03" },
      selectedChats: [
        { id: "session_synthetic_001", label: "Synthetic Session" },
        { id: "room_synthetic_001@chatroom", label: "Synthetic Group" },
      ],
    };

    expect(mapSearchAdvancedFiltersToRequest(filters)).toEqual({
      chats: ["session_synthetic_001", "room_synthetic_001@chatroom"],
      since: 1767312000,
      until: 1767484799,
    });
  });

  it("marks unsupported sender, favorite and attachment filters with explicit disabled reasons", () => {
    expect(resolveSearchFilterCapabilities()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "sender", status: "disabled" }),
        expect.objectContaining({ field: "favoriteOnly", status: "disabled" }),
        expect.objectContaining({ field: "attachmentOnly", status: "disabled" }),
      ]),
    );
  });

  it("builds clearable active chips without exposing selected chat labels", () => {
    const chips = buildSearchAdvancedFilterChips({
      ...createDefaultSearchAdvancedFilters(),
      dateRange: { start: "2026-01-02", end: "2026-01-03" },
      selectedChats: [{ id: "session_synthetic_001", label: "Private Session" }],
      sortMode: "time-asc",
      groupMode: "conversation",
    });

    expect(chips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dateRange", value: "2026-01-02 到 2026-01-03" }),
        expect.objectContaining({ id: "selectedChats", value: "1 个会话" }),
        expect.objectContaining({ id: "sortMode", value: "时间从早到晚" }),
        expect.objectContaining({ id: "groupMode", value: "按会话分组" }),
      ]),
    );
    expect(JSON.stringify(chips)).not.toContain("Private Session");
  });
});
