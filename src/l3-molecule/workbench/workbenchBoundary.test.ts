import { describe, expect, it } from "vitest";
import { WorkbenchRail, type WorkbenchRailItemState } from "./WorkbenchRail";

describe("workbench L3 boundary", () => {
  it("renders caller-provided rail items instead of deriving them internally", () => {
    const items: WorkbenchRailItemState[] = [
      { module: "chat", label: "自定义会话", active: true },
    ];

    const element = WorkbenchRail({
      showLabels: true,
      items,
      onSelectModule: () => undefined,
    }) as { props: { children: Array<{ props: { label: string } }> } };

    expect(element.props.children).toHaveLength(1);
    expect(element.props.children[0]?.props.label).toBe("自定义会话");
  });
});
