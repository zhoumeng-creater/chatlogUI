import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { HermesBridgeView } from "@l2/commander/hookViewModel";
import { HermesBridgePanel } from "./HermesBridgePanel";

describe("HermesBridgePanel", () => {
  it("describes why Hermes config save is disabled in privacy mode", () => {
    const html = renderHermes({ privacyOn: true });

    expect(html).toContain("隐私模式下不可保存 Hermes 配置");
    expect(html).toContain("关闭隐私模式后可填写完整配置");
  });

  it("describes incomplete and non-editable Hermes save states", () => {
    const incomplete = renderHermes();
    const nonEditable = renderHermes({
      bridges: bridges().map((bridge) => ({ ...bridge, editable: false })),
    });

    expect(incomplete).toContain("请填写完整配置后保存");
    expect(nonEditable).toContain("当前桥接状态不允许保存配置");
  });
});

function renderHermes({
  privacyOn = false,
  saving = false,
  bridges: nextBridges = bridges(),
}: {
  privacyOn?: boolean;
  saving?: boolean;
  bridges?: HermesBridgeView[];
} = {}): string {
  return renderToStaticMarkup(
    <HermesBridgePanel
      bridges={nextBridges}
      privacyOn={privacyOn}
      saving={saving}
      onRefresh={vi.fn()}
      onSaveWeixin={vi.fn()}
      onSaveQQ={vi.fn()}
    />,
  );
}

function bridges(): HermesBridgeView[] {
  return [
    {
      id: "weixin",
      label: "企业微信",
      editable: true,
      installedLabel: "已安装",
      enabledLabel: "已启用",
      credentialLabel: "凭据未配置",
      channelLabel: "频道未配置",
      pathLabel: "路径未配置",
      error: null,
    },
    {
      id: "qq",
      label: "QQ",
      editable: true,
      installedLabel: "已安装",
      enabledLabel: "已启用",
      credentialLabel: "凭据未配置",
      channelLabel: "频道未配置",
      pathLabel: "路径未配置",
      error: null,
    },
  ];
}
