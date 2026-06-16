import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SnsFilterChips } from "./SnsFilterChips";
import type { SnsFilterChip } from "@l2/commander/snsFilterModel";

describe("SnsFilterChips", () => {
  it("renders active filters as clearable chips with capability copy and dirty state", () => {
    const html = renderToStaticMarkup(
      <SnsFilterChips
        chips={[
          chip({ id: "user", label: "作者", value: "已隐藏作者筛选", capability: "backend-applied" }),
          chip({ id: "contentType", label: "类型", value: "图片", capability: "local-only" }),
        ]}
        dirty
        onClear={vi.fn()}
        onOpenFilters={vi.fn()}
      />,
    );

    expect(html).toContain("筛选未应用");
    expect(html).toContain("接口筛选");
    expect(html).toContain("本地筛选");
    expect(html).toContain("已隐藏作者筛选");
    expect(html).not.toContain("wxid_");
  });

  it("keeps chip clear buttons at project minimum target size", () => {
    const html = renderToStaticMarkup(
      <SnsFilterChips
        chips={[chip({ id: "contentType", label: "类型", value: "图片", capability: "local-only" })]}
        dirty={false}
        onClear={vi.fn()}
        onOpenFilters={vi.fn()}
      />,
    );

    expect(html).toContain('data-hit-target="32"');
  });
});

function chip(overrides: Partial<SnsFilterChip>): SnsFilterChip {
  return {
    id: "user",
    label: "作者",
    value: "已隐藏作者筛选",
    field: "user",
    capability: "backend-applied",
    clearable: true,
    ariaLabel: "作者：已隐藏作者筛选，接口筛选",
    ...overrides,
  };
}
