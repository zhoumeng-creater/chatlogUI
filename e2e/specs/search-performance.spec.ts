import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { setDesktop } from "../utils/viewport";

const METRICS_FILE = resolve(
  process.env.RUNTIME_PERF_METRICS_FILE ??
    "output/playwright/search-runtime-metrics.json",
);

test("records the measured 50-hit search first-result visibility budget", async ({ page }) => {
  await page.route("**/api/v1/search**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      json: createFiftyHitSearchPage(),
    });
  });

  await setDesktop(page);
  await page.goto("/search?codex-smoke=workbench-ready");
  await expect(page.getByRole("region", { name: "搜索工作区" })).toBeVisible();
  await expect(page.getByRole("button", { name: "全部消息类型" })).toBeVisible();

  await page.getByLabel("搜索聊天记录", { exact: true }).fill("Synthetic performance");
  const submit = page
    .getByRole("region", { name: "搜索工作区" })
    .getByRole("button", { name: "搜索", exact: true });
  const firstResultVisibleMs = await submit.evaluate((button) =>
    new Promise<number>((resolveMetric, rejectMetric) => {
      const startedAt = performance.now();
      const timeout = window.setTimeout(() => {
        observer.disconnect();
        rejectMetric(new Error("Timed out waiting for the first measured search result."));
      }, 10_000);
      const finishIfVisible = () => {
        const firstResult = Array.from(
          document.querySelectorAll<HTMLElement>(".search-result-row"),
        ).find((row) => row.textContent?.includes("Synthetic performance result 1"));
        if (!firstResult) return;
        const bounds = firstResult.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        window.clearTimeout(timeout);
        observer.disconnect();
        resolveMetric(performance.now() - startedAt);
      };
      const observer = new MutationObserver(finishIfVisible);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      button.click();
      finishIfVisible();
    }),
  );
  await expect(page.getByText("Synthetic performance result 1", { exact: true })).toBeVisible();

  await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
    "已加载 50 / 共 50",
  );
  await mkdir(dirname(METRICS_FILE), { recursive: true });
  await writeFile(
    METRICS_FILE,
    `${JSON.stringify({ searchFirstResultVisibleMs: firstResultVisibleMs }, null, 2)}\n`,
    "utf8",
  );
});

function createFiftyHitSearchPage() {
  return {
    snapshot_id: "snapshot-search-performance-v2",
    data_revision: "revision-search-performance-v2",
    exact_total: true,
    complete_scope: true,
    total_count: 50,
    count: 50,
    window_start: 0,
    previous_cursor: "",
    next_cursor: "",
    has_previous: false,
    has_next: false,
    messages: Array.from({ length: 50 }, (_, index) => ({
      message_id: `search-performance-message-${index + 1}`,
      seq: index + 1,
      source_index: index,
      conversation_id: `search-performance-conversation-${(index % 4) + 1}`,
      conversation_name: `Synthetic performance conversation ${(index % 4) + 1}`,
      sender_id: `search-performance-sender-${(index % 6) + 1}`,
      sender_name: `Synthetic performance sender ${(index % 6) + 1}`,
      timestamp: 1_767_254_400 + index,
      type: 1,
      sub_type: 0,
      category: "text",
      match_field: "content",
      snippet: `Synthetic performance result ${index + 1}`,
      match_segments: [
        { text: "Synthetic performance", matched: true },
        { text: ` result ${index + 1}`, matched: false },
      ],
    })),
  };
}
