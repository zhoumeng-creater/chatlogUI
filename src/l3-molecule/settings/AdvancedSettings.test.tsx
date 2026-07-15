import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdvancedSettings } from "./AdvancedSettings";

describe("AdvancedSettings", () => {
  it("uses the same privacy and diagnostics label as the Settings navigation", () => {
    const html = renderToStaticMarkup(
      <AdvancedSettings
        copy={advancedCopy}
        settings={{
          theme: "system",
          fontSize: "medium",
          reduceAnimations: false,
          windowMaterial: "none",
          wxDataPath: "",
          privacyOn: false,
          developerMode: false,
        }}
        saveStatus="idle"
        saveMessage={null}
        rememberRecentSearches
        onChange={vi.fn()}
        onRememberRecentSearchesChange={vi.fn()}
      />,
    );

    expect(html).toContain("隐私与诊断");
    expect(html).toContain("隐私模式默认状态");
    expect(html).toContain("默认开启");
    expect(html).toContain("默认关闭");
    expect(html).toContain("记住最近搜索");
    expect(html).toContain("关闭后会立即删除现有最近搜索，并停止保存新的搜索记录。");
    expect(html).toContain("关闭并删除");
    expect(html).not.toContain("高级诊断</");
  });
});

const advancedCopy = {
  title: "隐私与诊断",
  privacyDefaultLabel: "隐私模式默认状态",
  privacyDefaultHint: "控制新打开工作区时是否默认隐藏私人内容。",
  privacyDefaultOff: "默认关闭",
  privacyDefaultOn: "默认开启",
  recentSearchesLabel: "记住最近搜索",
  recentSearchesHint: "关闭后会立即删除现有最近搜索，并停止保存新的搜索记录。",
  recentSearchesDisabled: "关闭并删除",
  recentSearchesEnabled: "开启",
  developerEntryLabel: "开发者工具入口",
  developerHint: "仅控制本机高级诊断入口；复制和导出诊断仍会脱敏。",
  developerDisabled: "隐藏",
  developerEnabled: "显示",
};
