import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkbenchRail, type WorkbenchRailItemState } from "./WorkbenchRail";

describe("WorkbenchRail", () => {
  it("uses shared tooltip descriptions instead of native title for collapsed rail commands", () => {
    const html = renderToStaticMarkup(
      <WorkbenchRail
        showLabels={false}
        items={items()}
        onSelectModule={vi.fn()}
      />,
    );

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.length).toBe(items().length);
    expect(descriptionIds.every((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain("ui-tooltip--right");
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("打开AI模块");
    expect(html).toContain("AI");
    expect(html).not.toContain("title=");
  });
});

function items(): WorkbenchRailItemState[] {
  return [
    { module: "chat", label: "聊天", active: false },
    { module: "ai", label: "AI", active: true, badge: "2" },
  ];
}
