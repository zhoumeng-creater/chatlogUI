import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

async function collectSourceFiles(dir) {
  const files = [];
  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(item.name) && !/\.(test|spec)\.(ts|tsx)$/.test(item.name)) {
      files.push(fullPath.replaceAll("\\", "/"));
    }
  }
  return files;
}

const knownL3StyleDebt = new Set([
  "src/l3-molecule/chat/ConversationRow.tsx: inline style",
  "src/l3-molecule/chat/MediaPreview.tsx: inline style",
  "src/l3-molecule/chat/MessageList.tsx: inline style",
  "src/l3-molecule/common/DevConsole.tsx: template className",
  "src/l3-molecule/common/UpdateNotificationView.tsx: template className",
  "src/l3-molecule/stats/DashboardOverview.tsx: inline style",
  "src/l3-molecule/stats/TrendChart.tsx: inline style",
  "src/l3-molecule/workbench/WorkbenchFrame.tsx: inline style",
]);

const knownNativeTitleUsage = new Set([
  "src/l3-molecule/graph/GraphFallbackTable.tsx: <Typography variant=\"label\" role=\"cell\" title={display.label}>",
  "src/l3-molecule/graph/GraphFallbackTable.tsx: <Typography variant=\"caption\" color=\"var(--text-secondary)\" role=\"cell\" title={display.detail}>",
  "src/l4-atom/ui/StatusIndicator.tsx: <span className={classNames(\"ui-status-indicator\", `ui-status-indicator--${tone}`)} title={title ?? label}>",
  "src/l3-molecule/stats/TrendChart.tsx: title={`${point.date}: ${point.count}`}",
  "src/l3-molecule/developer/EndpointRunner.tsx: title=\"Redacted Response\"",
  "src/l3-molecule/common/AppLayout.tsx: title={shell.title}",
  "src/l3-molecule/semantic/SemanticSetupCenter.tsx: title=\"Embedding\"",
  "src/l3-molecule/semantic/SemanticSetupCenter.tsx: title=\"Rerank\"",
  "src/l3-molecule/semantic/SemanticSetupCenter.tsx: title=\"Chat\"",
]);

const highImpactDisabledReasonFiles = [
  "src/l3-molecule/media/MediaLibrary.tsx",
  "src/l3-molecule/search/SearchScopeMenu.tsx",
  "src/l3-molecule/developer/DbSearchPanel.tsx",
  "src/l3-molecule/semantic/QAInput.tsx",
  "src/l3-molecule/semantic/SemanticIndexPreview.tsx",
  "src/l3-molecule/graph/GraphAdvancedPanel.tsx",
  "src/l3-molecule/graph/GraphQAPanel.tsx",
  "src/l3-molecule/graph/GraphVisualizePanel.tsx",
  "src/l3-molecule/developer/DbExplorer.tsx",
  "src/l3-molecule/developer/EndpointRunner.tsx",
  "src/l3-molecule/developer/SqlQueryPanel.tsx",
  "src/l3-molecule/developer/HookConfigPanel.tsx",
  "src/l3-molecule/developer/HermesBridgePanel.tsx",
  "src/l3-molecule/diagnostics/DiagnosticCopyButton.tsx",
  "src/l3-molecule/diagnostics/DiagnosticsPanel.tsx",
];

function collectJsxBlocks(text, tagName) {
  const blocks = [];
  let current = null;

  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!current && !line.includes(`<${tagName}`)) return;
    if (!current) {
      current = { startLine: index + 1, lines: [] };
    }
    current.lines.push(trimmed);

    if (
      trimmed === "/>" ||
      trimmed.includes(`</${tagName}>`) ||
      (current.lines.length === 1 && trimmed.includes("/>"))
    ) {
      blocks.push({
        startLine: current.startLine,
        text: current.lines.join(" "),
      });
      current = null;
    }
  });

  return blocks;
}

function collectDisabledBlocksWithoutDescription(text) {
  const blockTags = ["Button", "Input", "Select", "button", "input", "select", "textarea"];
  const offenders = [];

  for (const tagName of blockTags) {
    for (const block of collectJsxBlocks(text, tagName)) {
      const hasDisabledState = block.text.includes("disabled=") || (tagName === "Button" && block.text.includes("loading="));
      if (hasDisabledState && !block.text.includes("aria-describedby")) {
        offenders.push(`${tagName}:${block.startLine}`);
      }
    }
  }

  return offenders;
}

describe("UI governance", () => {
  it("does not expose deprecated AppleButton or GlassPanel primitives", async () => {
    const barrel = await readFile("src/l4-atom/ui/index.ts", "utf8");

    expect(existsSync("src/l4-atom/ui/AppleButton.tsx")).toBe(false);
    expect(existsSync("src/l4-atom/ui/GlassPanel.tsx")).toBe(false);
    expect(barrel).not.toContain("AppleButton");
    expect(barrel).not.toContain("GlassPanel");
  });

  it("uses the shared classNames helper in L4 UI primitives", async () => {
    const files = await collectSourceFiles("src/l4-atom/ui");
    const offenders = [];

    for (const file of files) {
      const text = await readFile(file, "utf8");
      if (text.includes(".filter(Boolean).join(") || text.includes("className={`")) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps L3 inline style and manual class composition debt explicitly tracked", async () => {
    const files = await collectSourceFiles("src/l3-molecule");
    const offenders = [];
    const patterns = [
      { label: "inline style", matcher: "style={{" },
      { label: "manual class join", matcher: ".filter(Boolean).join(" },
      { label: "template className", matcher: "className={`" },
    ];

    for (const file of files) {
      const text = await readFile(file, "utf8");
      for (const pattern of patterns) {
        if (text.includes(pattern.matcher)) {
          offenders.push(`${file}: ${pattern.label}`);
        }
      }
    }

    const untrackedOffenders = offenders.filter((entry) => !knownL3StyleDebt.has(entry));
    const missingTrackedDebt = [...knownL3StyleDebt].filter((entry) => !offenders.includes(entry));

    expect(untrackedOffenders).toEqual([]);
    expect(missingTrackedDebt).toEqual([]);
  });

  it("keeps native title usage explicit so command tooltip debt cannot grow silently", async () => {
    const files = await collectSourceFiles("src");
    const titleUsages = [];

    for (const file of files) {
      const text = await readFile(file, "utf8");
      for (const line of text.split(/\r?\n/)) {
        if (line.includes("title=")) {
          titleUsages.push(`${file}: ${line.trim()}`);
        }
      }
    }

    const untrackedTitleUsages = titleUsages.filter((entry) => !knownNativeTitleUsage.has(entry));
    const missingTrackedTitleUsages = [...knownNativeTitleUsage].filter((entry) => !titleUsages.includes(entry));

    expect(untrackedTitleUsages).toEqual([]);
    expect(missingTrackedTitleUsages).toEqual([]);
  });

  it("keeps IconButton command affordances backed by tooltip copy at call sites", async () => {
    const files = await collectSourceFiles("src");
    const untooltippedIconButtons = [];

    for (const file of files) {
      const text = await readFile(file, "utf8");
      for (const block of collectJsxBlocks(text, "IconButton")) {
        if (!block.text.includes("tooltip=")) {
          untooltippedIconButtons.push(`${file}:${block.startLine}`);
        }
      }
    }

    expect(untooltippedIconButtons).toEqual([]);
  });

  it("keeps Tauri current-window APIs owned by L4 system atoms", async () => {
    const files = await collectSourceFiles("src");
    const forbiddenWindowImports = [];

    for (const file of files) {
      const text = await readFile(file, "utf8");
      if (file.startsWith("src/l4-atom/system/")) continue;
      if (text.includes("@tauri-apps/api/window")) {
        forbiddenWindowImports.push(file);
      }
    }

    expect(forbiddenWindowImports).toEqual([]);
  });

  it("keeps high-impact disabled-control reason debt explicitly tracked", async () => {
    const untrackedDebt = [];

    for (const file of highImpactDisabledReasonFiles) {
      const text = await readFile(file, "utf8");
      const missingDescriptionBlocks = collectDisabledBlocksWithoutDescription(text);
      untrackedDebt.push(...missingDescriptionBlocks.map((entry) => `${file}: ${entry}`));
    }

    expect(untrackedDebt).toEqual([]);
  });

  it("keeps high-impact disabled reasons on the shared primitive", async () => {
    const localReasonBypasses = [];

    for (const file of highImpactDisabledReasonFiles) {
      const text = await readFile(file, "utf8");
      if (!text.includes("DisabledReason")) {
        localReasonBypasses.push(`${file}: missing DisabledReason`);
      }
      if (/<p[^>]*className="sr-only"/.test(text)) {
        localReasonBypasses.push(`${file}: raw sr-only disabled reason`);
      }
    }

    expect(localReasonBypasses).toEqual([]);
  });
});
