import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TranscriptScrollControls } from "./TranscriptScrollControls";

describe("TranscriptScrollControls", () => {
  it("renders accessible scroll and anchor controls with disabled reasons", () => {
    const html = renderToStaticMarkup(
      <TranscriptScrollControls
        positionText="当前查看：2024-04-28 09:20 附近"
        stickyDateLabel="2024-04-28"
        topTerminalText={null}
        bottomTerminalText={null}
        controls={[
          { id: "latest", label: "回到最新", disabled: false, disabledReason: null },
          { id: "return-anchor", label: "回到命中", disabled: false, disabledReason: null },
          { id: "previous-hit", label: "上一条命中", disabled: true, disabledReason: "当前只知道一个命中锚点。" },
        ]}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain("当前查看：2024-04-28 09:20 附近");
    expect(html).toContain("2024-04-28");
    expect(html).toContain("回到最新");
    expect(html).toContain("回到命中");
    expect(html).toContain("当前只知道一个命中锚点。");
    expect(html).toContain('aria-label="聊天滚动控制"');
  });
});
