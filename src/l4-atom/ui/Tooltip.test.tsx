import { renderToStaticMarkup } from "react-dom/server";
import { Settings } from "lucide-react";
import { describe, expect, it } from "vitest";
import { IconButton } from "./IconButton";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("can receive a stable id for accessible descriptions", () => {
    const html = renderToStaticMarkup(
      <Tooltip id="settings-tooltip" label="打开设置面板">
        <button type="button">设置</button>
      </Tooltip>,
    );

    expect(html).toContain('role="tooltip"');
    expect(html).toContain('id="settings-tooltip"');
  });

  it("preserves existing descriptions and renders placement classes", () => {
    const html = renderToStaticMarkup(
      <Tooltip id="rail-tooltip" label="打开媒体模块" placement="right">
        <button type="button" aria-describedby="existing-description">
          媒体
        </button>
      </Tooltip>,
    );

    expect(html).toContain('class="ui-tooltip ui-tooltip--right"');
    expect(html).toContain('aria-describedby="existing-description rail-tooltip"');
  });

  it("links tooltip-enabled icon commands with aria-describedby instead of native title", () => {
    const html = renderToStaticMarkup(
      <IconButton
        icon={<Settings size={16} />}
        label="设置"
        tooltip="打开设置面板"
      />,
    );

    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}"`);
    expect(html).toContain("打开设置面板");
    expect(html).not.toContain("title=");
  });

  it("does not fall back to native title when an icon command has no tooltip", () => {
    const html = renderToStaticMarkup(
      <IconButton
        icon={<Settings size={16} />}
        label="设置"
      />,
    );

    expect(html).toContain('aria-label="设置"');
    expect(html).not.toContain("title=");
  });
});
