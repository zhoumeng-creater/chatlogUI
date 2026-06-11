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

  it("keeps tooltip bubbles from sticking after pointer activation", async () => {
    const layoutCss = await readFile("src/styles/layout.css", "utf8");
    const iconButton = await readFile("src/l4-atom/ui/IconButton.tsx", "utf8");

    expect(layoutCss).toContain(".ui-tooltip:focus-within .ui-tooltip__bubble");
    expect(layoutCss).toContain(".ui-tooltip:hover .ui-tooltip__bubble");
    expect(iconButton).toContain("handlePointerUp");
    expect(iconButton).toContain("event.currentTarget.blur()");
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

  it("keeps Field error descriptions linked by the shared Field atom", async () => {
    const text = await readFile("src/l4-atom/ui/Field.tsx", "utf8");

    expect(text).toContain("\"aria-errormessage\"");
    expect(text).not.toContain("hint && !error");
  });

  it("keeps SpringModal on the shared class-based overlay focus primitive", async () => {
    const text = await readFile("src/l4-atom/ui/SpringModal.tsx", "utf8");

    expect(text).not.toContain("style={{");
    expect(text).toContain("getOverlayDialogProps");
    expect(text).toContain("trapOverlayFocus");
    expect(text).toContain("restoreFocusTarget");
  });

  it("keeps semantic confirmation dialogs on the shared SemanticConfirmDialog component", async () => {
    const files = await collectSourceFiles("src/l3-molecule/semantic");
    const adHocConfirmations = [];

    for (const file of files) {
      if (file.endsWith("SemanticConfirmDialog.tsx")) continue;
      const text = await readFile(file, "utf8");
      if (text.includes("semantic-confirm")) {
        adHocConfirmations.push(file);
      }
    }

    expect(adHocConfirmations).toEqual([]);
  });

  it("keeps SNS external-open confirmation on the shared overlay focus lifecycle", async () => {
    const text = await readFile("src/l3-molecule/sns/SnsExternalOpenDialog.tsx", "utf8");

    expect(text).toContain("focusInitialOverlayTarget");
    expect(text).toContain("trapOverlayFocus");
    expect(text).toContain("restoreFocusTarget");
    expect(text).toContain("shouldCloseOverlayOnKey");
    expect(text).toContain("onKeyDown");
    expect(text).toContain("getOverlayDialogProps");
  });

  it("keeps empty SNS search submissions out of the error state", async () => {
    const text = await readFile("src/l2-coordinator/commander/useSnsCommander.ts", "utf8");

    expect(text).not.toContain('setSearchError("请输入朋友圈搜索关键词")');
    expect(text).toContain("setSearchResults([])");
  });

  it("keeps setup foundation components off demo utility color classes", async () => {
    const files = await collectSourceFiles("src/l3-molecule/setup");
    const demoClassUsages = [];
    const demoClassPattern = /\b(?:bg|text|border)-(?:green|red|gray|blue|slate|zinc|neutral|stone|yellow|orange|purple|indigo|cyan|sky|emerald|rose)-\d{2,3}\b|space-y-\d/g;

    for (const file of files) {
      const text = await readFile(file, "utf8");
      const matches = text.match(demoClassPattern);
      if (matches) {
        demoClassUsages.push(`${file}: ${[...new Set(matches)].join(", ")}`);
      }
    }

    expect(demoClassUsages).toEqual([]);
  });

  it("keeps Workbench toolbar and inspector from regressing into full workspace containers", async () => {
    const workbenchView = await readFile("src/l1-entry/pages/WorkbenchView.tsx", "utf8");
    const layoutCss = await readFile("src/styles/layout.css", "utf8");
    const forbiddenWorkbenchViewMarkers = [
      "workbench-frame__module-tabs",
      "<SearchResults",
      "function InspectorContent",
      "<MediaLibrary",
      "<SnsModule",
      "<DeveloperToolsModule",
      "<LazyAiPanel",
    ];

    const foundMarkers = forbiddenWorkbenchViewMarkers.filter((marker) => workbenchView.includes(marker));
    expect(foundMarkers).toEqual([]);

    const toolbarRule = layoutCss.match(/\.workbench-frame__toolbar\s*\{[\s\S]*?\}/)?.[0] ?? "";
    expect(toolbarRule).not.toContain("max-height");
    expect(toolbarRule).not.toContain("overflow: auto");
  });

  it("keeps search results on the primary search page with full-height ownership", async () => {
    const searchView = await readFile("src/l1-entry/pages/SearchView.tsx", "utf8");
    const workbenchView = await readFile("src/l1-entry/pages/WorkbenchView.tsx", "utf8");
    const layoutCss = await readFile("src/styles/layout.css", "utf8");
    const workbenchContentCss = await readFile("src/styles/workbench-content.css", "utf8");

    expect(searchView).toContain("search-workspace__results");
    expect(workbenchView).not.toContain("<SearchResults");
    expect(layoutCss).toContain(".search-workspace__results");
    expect(workbenchContentCss).toContain(".search-workspace__results .search-result-pane");
    expect(workbenchContentCss).toContain("max-height: none");
  });

  it("keeps search-hit navigation orchestration out of L1 pages", async () => {
    const searchView = await readFile("src/l1-entry/pages/SearchView.tsx", "utf8");
    const forbiddenMarkers = [
      "resolveSearchHitNavigation",
      "chat.selectAndLoadAtAnchor",
      "search.setError(target.message)",
    ];

    const foundMarkers = forbiddenMarkers.filter((marker) => searchView.includes(marker));
    expect(foundMarkers).toEqual([]);
  });

  it("keeps independent primary pages on a shared privacy-safe scope status contract", async () => {
    const pageFiles = [
      "src/l1-entry/pages/AnalyticsView.tsx",
      "src/l1-entry/pages/MediaView.tsx",
      "src/l1-entry/pages/SnsView.tsx",
      "src/l1-entry/pages/AiWorkspaceView.tsx",
      "src/l1-entry/pages/GraphView.tsx",
    ];

    for (const file of pageFiles) {
      const text = await readFile(file, "utf8");
      expect(text, file).toContain("<WorkspaceScopeStatus");
      expect(text, file).toContain("workspaceRouteScope");
    }

    const workbenchView = await readFile("src/l1-entry/pages/WorkbenchView.tsx", "utf8");
    expect(workbenchView).not.toContain("<WorkspaceScopeStatus");
  });

  it("keeps the AI primary page from duplicating primary rail navigation", async () => {
    const aiWorkspaceView = await readFile("src/l1-entry/pages/AiWorkspaceView.tsx", "utf8");
    const aiPanel = await readFile("src/l3-molecule/semantic/AiPanel.tsx", "utf8");
    const layoutCss = await readFile("src/styles/layout.css", "utf8");

    expect(aiWorkspaceView).not.toContain("onModeChange");
    expect(aiPanel).not.toContain("onModeChange");
    expect(aiPanel).not.toContain("PanelMode");
    expect(aiPanel).not.toContain("semantic-panel__modebar");
    expect(layoutCss).not.toContain(".semantic-panel__modebar");
  });

  it("keeps release visual evidence broad enough for global acceptance claims", async () => {
    const visualSpec = await readFile("e2e/specs/visual.spec.ts", "utf8");
    const evidence = await readFile("docs/release/release-evidence.md", "utf8");
    const requiredSnapshots = [
      "setup-center-desktop.png",
      "settings-about-diagnostics-desktop.png",
      "media-workspace-desktop.png",
      "sns-workspace-desktop.png",
      "settings-privacy-narrow.png",
    ];
    const requiredPageScores = [
      "Setup `/`: 18/20",
      "Settings `/settings`: 18/20",
      "Media `/media`: 17/20",
      "SNS `/sns`: 17/20",
      "AI `/ai`: 18/20",
      "Graph `/graph`: 18/20",
    ];

    for (const snapshot of requiredSnapshots) {
      expect(visualSpec, snapshot).toContain(snapshot);
    }

    expect(evidence).toContain("## Page Score And Visual Evidence");
    for (const score of requiredPageScores) {
      expect(evidence, score).toContain(score);
    }
  });
});
