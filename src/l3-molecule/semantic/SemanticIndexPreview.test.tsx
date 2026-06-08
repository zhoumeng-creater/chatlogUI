import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SemanticIndexPreview } from "./SemanticIndexPreview";
import type { SemanticPreviewView } from "@l2/commander/semanticPreviewViewModel";

describe("SemanticIndexPreview", () => {
  it("describes disabled pager controls while preview data is loading", () => {
    const html = renderPreview({ status: "loading", canPagePrevious: false, canPageNext: false });

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.length).toBeGreaterThanOrEqual(2);
    expect(descriptionIds.every((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain("正在加载预览");
    expect(html).toContain("加载完成后可翻页");
    expect(html).toContain("加载完成后可刷新");
  });

  it("describes first-page and last-page pager boundaries", () => {
    const firstPage = renderPreview({ canPagePrevious: false, canPageNext: true });
    const lastPage = renderPreview({ canPagePrevious: true, canPageNext: false });

    expect(firstPage).toContain("当前已经是第一页");
    expect(lastPage).toContain("当前没有下一页");
  });
});

function renderPreview(overrides: Partial<SemanticPreviewView>): string {
  return renderToStaticMarkup(
    <SemanticIndexPreview
      view={view(overrides)}
      kind="all"
      limit={20}
      talker=""
      talkerOptions={[]}
      privacyOn={false}
      onKindChange={vi.fn()}
      onLimitChange={vi.fn()}
      onTalkerChange={vi.fn()}
      onRefresh={vi.fn()}
      onPreviousPage={vi.fn()}
      onNextPage={vi.fn()}
    />,
  );
}

function view(overrides: Partial<SemanticPreviewView> = {}): SemanticPreviewView {
  return {
    status: "ready",
    kind: "all",
    summary: "2 vectors · 0 shown · 0 outliers",
    modelSummary: "synthetic-model · 768 dims · sample 3",
    groups: [],
    rows: [],
    outliers: [],
    canPagePrevious: false,
    canPageNext: false,
    errorCopy: null,
    ...overrides,
  };
}
