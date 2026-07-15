import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  runSearchReadinessAction,
  SearchReadinessNotice,
} from "./SearchReadinessNotice";

describe("SearchReadinessNotice", () => {
  it("renders no duplicate notice after readiness", () => {
    const html = renderToStaticMarkup(
      <SearchReadinessNotice
        phase="ready"
        reason={null}
        onRecoverService={vi.fn()}
        onRecheckDatabase={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );
    expect(html).toBe("");
  });

  it("keeps loading informational and exposes no duplicate action", () => {
    const html = renderToStaticMarkup(
      <SearchReadinessNotice
        phase="database-loading"
        reason="正在加载聊天数据库"
        onRecoverService={vi.fn()}
        onRecheckDatabase={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain("正在加载聊天数据库");
    expect(html).not.toContain("<button");
  });

  it("offers exact database recovery and settings actions", () => {
    const onRecheckDatabase = vi.fn();
    const onOpenSettings = vi.fn();
    const callbacks = {
      onRecoverService: vi.fn(),
      onRecheckDatabase,
      onOpenSettings,
    };
    runSearchReadinessAction("recheck-database", callbacks);
    runSearchReadinessAction("data-settings", callbacks);
    expect(onRecheckDatabase).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledWith("data");
  });
});
