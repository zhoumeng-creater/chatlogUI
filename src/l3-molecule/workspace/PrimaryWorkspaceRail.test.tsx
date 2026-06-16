import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PrimaryWorkspaceRail } from "./PrimaryWorkspaceRail";
import type { PrimaryWorkspaceRailItem } from "@/l2-coordinator/commander/primaryWorkspaceNavigation";

describe("PrimaryWorkspaceRail", () => {
  it("renders primary workspace links with page-current semantics and no developer/settings items", () => {
    const html = renderToStaticMarkup(
      <PrimaryWorkspaceRail
        railMode="collapsed"
        showLabels
        canToggleLabels
        items={items()}
        onToggleLabels={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(html).toContain("展开导航栏");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("打开搜索");
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("开发");
    expect(html).not.toContain("设置");
    expect(html).not.toContain("打开AI模块");
  });

  it("hides the rail toggle where narrow top rail behavior is forced", () => {
    const html = renderToStaticMarkup(
      <PrimaryWorkspaceRail
        railMode="collapsed"
        showLabels={false}
        canToggleLabels={false}
        items={items()}
        onToggleLabels={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(html).not.toContain("展开导航栏");
    expect(html).toContain("打开搜索");
  });
});

function items(): PrimaryWorkspaceRailItem[] {
  return [
    { id: "workbench", label: "会话", route: "/workbench", active: false },
    { id: "search", label: "搜索", route: "/search", active: true },
    { id: "ai", label: "AI", route: "/ai", active: false },
  ];
}
