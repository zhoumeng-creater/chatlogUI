import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import { AboutSettings } from "./AboutSettings";

describe("AboutSettings", () => {
  it("folds full diagnostics details by default behind an accessible disclosure", () => {
    const html = renderToStaticMarkup(
      <AboutSettings
        copy={aboutCopy}
        diagnosticsCopy={diagnosticsCopy}
        updateStatusText=""
        onCheckUpdate={vi.fn(async () => undefined)}
        diagnosticReport={diagnosticReport}
        diagnosticCopyText="Export manifest version: 2.0"
        onExportDiagnostics={vi.fn(async () => ({
          status: "completed",
          locationSummary: "diagnostics.txt",
        } as const))}
      />,
    );

    expect(html).toContain("chatlogUI");
    expect(html).toContain("本机聊天服务内核信息");
    expect(html).toContain("脱敏诊断");
    expect(html).toContain("aria-expanded=\"false\"");
    expect(html).not.toContain("Export manifest version");
    expect(html).not.toContain("Backend base URL");
    expect(html).not.toContain("复制诊断");
    expect(html).not.toContain("导出诊断");
  });
});

const diagnosticReport: DiagnosticsReport = {
  redactionOk: true,
  lines: [
    { label: "Export manifest version", value: "2.0" },
    { label: "Backend base URL", value: "http://127.0.0.1:5030" },
  ],
};

const aboutCopy = {
  title: "关于",
  productName: "chatlogUI",
  productDescription: "本机聊天记录桌面工作台",
  versionPrefix: "应用版本",
  kernelTitle: "本机聊天服务内核信息",
  kernelDescription: "诊断层信息用于排查本机服务问题，普通路径不依赖这些技术名词。",
  kernelRuntimeNote: "Sidecar 版本需在运行时由本地 chatlog_alpha 提供；当前设置页不伪造版本号。",
  licenseTitle: "开源许可",
  licenseDescription: "基于本机聊天服务内核构建。本软件仅供个人学习和研究使用。",
  updateTitle: "更新",
  checkUpdate: "检查更新",
  updateChecking: "正在检查更新...",
  updateCurrent: "已是最新版本",
};

const diagnosticsCopy = {
  title: "脱敏诊断",
  description: "默认只显示安全摘要；需要排查问题时再展开复制或导出脱敏诊断。",
  exportReady: "可导出",
  exportBlocked: "已阻止导出",
  expand: "查看脱敏诊断",
  collapse: "收起脱敏诊断",
};
