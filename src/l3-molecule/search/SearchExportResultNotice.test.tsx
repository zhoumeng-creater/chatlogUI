import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchExportResultNotice } from "./SearchExportResultNotice";

describe("SearchExportResultNotice", () => {
  it("keeps the privacy-safe native completion summary visible after the dialog closes", () => {
    const html = renderToStaticMarkup(
      <SearchExportResultNotice
        result={{
          fileName: "chatlog-search.json",
          extension: "json",
          bytesWritten: 128,
          locationSummary: "chatlog-search.json · 128 B",
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("导出完成");
    expect(html).toContain("chatlog-search.json · 128 B");
    expect(html).toContain('aria-label="关闭导出完成提示"');
  });
});
