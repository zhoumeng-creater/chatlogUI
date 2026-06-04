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
    } else if (/\.(ts|tsx)$/.test(item.name)) {
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
});
