import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { HookConfigView } from "@l4/network";
import type { HookConfigViewModel } from "@l2/commander/hookViewModel";
import { HookConfigPanel } from "./HookConfigPanel";

describe("HookConfigPanel", () => {
  it("describes why Hook config save is disabled in privacy mode", () => {
    const html = renderHookConfig({ privacyOn: true });

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain("隐私模式下不可保存 Hook 配置");
    expect(html).toContain("关闭隐私模式后可编辑并保存");
  });

  it("describes why Hook config save is disabled while saving", () => {
    const html = renderHookConfig({ loading: true });

    expect(html).toContain("正在保存 Hook 配置");
    expect(html).toContain("保存完成后可再次提交");
  });

  it("describes why save is disabled when a configured POST URL would be cleared", () => {
    const html = renderHookConfig({
      config: {
        ...hookConfig,
        postUrlConfigured: true,
      },
    });

    expect(html).toContain("POST 目标已配置");
    expect(html).toContain("请输入完整 POST URL 后再保存");
    expect(html).toContain("避免清空现有目标");
  });

  it("describes why save is disabled when configured forwarding lists would be cleared", () => {
    const html = renderHookConfig({
      config: {
        ...hookConfig,
        forwardContactCount: 1,
        forwardChatroomCount: 0,
      },
    });

    expect(html).toContain("联系人转发名单已配置");
    expect(html).toContain("请输入完整联系人名单后再保存");
    expect(html).toContain("避免清空现有名单");
  });
});

function renderHookConfig({
  privacyOn = false,
  loading = false,
  config = hookConfig,
}: {
  privacyOn?: boolean;
  loading?: boolean;
  config?: HookConfigView;
} = {}): string {
  return renderToStaticMarkup(
    <HookConfigPanel
      config={config}
      view={hookView}
      privacyOn={privacyOn}
      loading={loading}
      onSave={vi.fn()}
    />,
  );
}

const hookConfig: HookConfigView = {
  keywords: ["synthetic-private-keyword"],
  notifyMode: "mcp",
  notifyTargets: {
    mcp: true,
    post: false,
    weixin: false,
    qq: false,
  },
  postUrlConfigured: false,
  beforeCount: 5,
  afterCount: 5,
  forwardAll: false,
  forwardContactCount: 0,
  forwardChatroomCount: 0,
};

const hookView: HookConfigViewModel = {
  keywordsCount: 1,
  notifyMode: "mcp",
  targets: [],
  postUrlLabel: "未配置 POST 目标",
  contextWindow: "5 before / 5 after",
  forwardScope: "0 contacts · 0 chatrooms",
};
