import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReadOnlySqlClassification } from "@l4/network";
import { SqlQueryPanel } from "./SqlQueryPanel";

describe("SqlQueryPanel", () => {
  it("describes privacy-disabled SQL controls without rendering the draft", () => {
    const html = renderSqlPanel({
      privacyOn: true,
      sqlDraft: "select * from synthetic_private_table",
      canRun: false,
    });

    expect(html).toContain("隐私模式下不可编辑或执行 SQL");
    expect(html).toContain("关闭隐私模式后可继续编辑");
    expect(html).not.toContain("synthetic_private_table");
  });

  it("describes blocked and loading SQL execution states", () => {
    const blocked = renderSqlPanel({ canRun: false, guard: blockedGuard("empty") });
    const loading = renderSqlPanel({ status: "loading", canRun: true, guard: allowedGuard });

    expect(blocked).toContain("请输入只读 SQL 后再执行");
    expect(loading).toContain("正在执行 SQL");
    expect(loading).toContain("完成后可再次执行");
  });
});

function renderSqlPanel({
  status = "idle",
  sqlDraft = "",
  privacyOn = false,
  guard = blockedGuard("empty"),
  canRun = false,
}: {
  status?: "idle" | "loading" | "ready" | "empty" | "error";
  sqlDraft?: string;
  privacyOn?: boolean;
  guard?: ReadOnlySqlClassification;
  canRun?: boolean;
} = {}): string {
  return renderToStaticMarkup(
    <SqlQueryPanel
      status={status}
      sqlDraft={sqlDraft}
      privacyOn={privacyOn}
      result={{
        columns: [],
        rows: [],
        rowCount: 0,
        columnCount: 0,
        isEmpty: true,
      }}
      error={null}
      guard={guard}
      canRun={canRun}
      onSqlDraftChange={vi.fn()}
      onRun={vi.fn()}
    />,
  );
}

const allowedGuard: ReadOnlySqlClassification = {
  allowed: true,
  kind: "select",
  message: "只读 SELECT 查询。",
};

function blockedGuard(reason: ReadOnlySqlClassification["reason"]): ReadOnlySqlClassification {
  return {
    allowed: false,
    kind: "blocked",
    reason,
    message: "请输入只读 SQL。",
  };
}
