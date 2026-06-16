import { describe, expect, it } from "vitest";
import {
  resolveSelectedSnsPostForExport,
  resolveSnsScopeClearAction,
} from "./useSnsCommander";
import type { WorkspaceScopeClearAction } from "./workspaceScopeModel";
import type { AdaptedSnsPost } from "@l4/network";
import type { SnsFilters } from "@l2/data-clerk/stores/useSnsStore";

describe("useSnsCommander helpers", () => {
  it("resolves selected SNS detail for notification exports from filtered posts", () => {
    const selected = resolveSelectedSnsPostForExport({
      selectedPostId: "post-1",
      feed: [post("post-1", "image", 1), post("post-2", "text", 0)],
      searchResults: [],
      filters: { ...filters(), mediaOnly: true },
    });

    expect(selected?.id).toBe("post-1");

    const hidden = resolveSelectedSnsPostForExport({
      selectedPostId: "post-2",
      feed: [post("post-2", "text", 0)],
      searchResults: [],
      filters: { ...filters(), mediaOnly: true },
    });

    expect(hidden).toBeNull();
  });

  it("maps workspace scope chip clears to L2 SNS filter fields", () => {
    const result = resolveSnsScopeClearAction(clearAction("dateRange"), {
      ...filters(),
      since: "2026-06-01",
      until: "2026-06-13",
      contentType: "article",
    });

    expect(result).toEqual({
      fields: ["since", "until"],
      requestBacked: true,
      nextFilters: {
        ...filters(),
        contentType: "article",
      },
    });

    expect(resolveSnsScopeClearAction(clearAction("snsMediaOnly"), { ...filters(), mediaOnly: true })).toMatchObject({
      fields: ["mediaOnly"],
      requestBacked: false,
      nextFilters: { ...filters(), mediaOnly: false },
    });
  });
});

function filters(): SnsFilters {
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

function clearAction(field: NonNullable<WorkspaceScopeClearAction["field"]>): WorkspaceScopeClearAction {
  return { type: "clearField", field };
}

function post(
  id: string,
  contentType: AdaptedSnsPost["contentType"],
  mediaCount: number,
): AdaptedSnsPost {
  return {
    id,
    timestamp: 1,
    time: "2026-01-02 09:00",
    author: { username: `${id}-user`, displayName: `${id} author` },
    content: `${id} content`,
    contentType,
    media: [],
    mediaCount,
    locationSummary: "",
    article: null,
    finder: null,
    hasRawContent: false,
  };
}
