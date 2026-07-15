import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectGraphCanvasReady } from "../utils/graph";
import { setDesktop } from "../utils/viewport";

const METRICS_FILE = resolve(
  process.env.RUNTIME_PERF_METRICS_FILE ?? "output/playwright/runtime-performance-metrics.json",
);
const LARGE_MESSAGE_COUNT = 1_000;

test("records every required runtime performance metric in one browser artifact", async ({
  page,
}) => {
  test.slow();
  await setDesktop(page);
  await rm(METRICS_FILE, { force: true });

  const metrics = {
    searchFirstResultVisibleMs: await measureSearchFirstResult(page),
    largeMessageListInitialRenderMs: await measureLargeMessageListInitialRender(page),
    graphCanvasFirstVisibleFrameMs: await measureGraphCanvasFirstVisibleFrame(page),
  };

  for (const durationMs of Object.values(metrics)) {
    expect(Number.isFinite(durationMs)).toBe(true);
    expect(durationMs).toBeGreaterThanOrEqual(0);
  }

  await mkdir(dirname(METRICS_FILE), { recursive: true });
  await writeFile(METRICS_FILE, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
});

async function measureSearchFirstResult(page: Page) {
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

  await page.goto("/search?codex-smoke=workbench-ready");
  await expect(page.getByRole("region", { name: "搜索工作区" })).toBeVisible();
  await expect(page.getByRole("button", { name: "全部消息类型" })).toBeVisible();

  await page.getByLabel("搜索聊天记录", { exact: true }).fill("Synthetic performance");
  const submit = page
    .getByRole("region", { name: "搜索工作区" })
    .getByRole("button", { name: "搜索", exact: true });
  const durationMs = await submit.evaluate(
    (button) =>
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
        (button as HTMLElement).click();
        finishIfVisible();
      }),
  );

  await expect(page.getByText("Synthetic performance result 1", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
    "已加载 50 / 共 50",
  );
  return durationMs;
}

async function measureLargeMessageListInitialRender(page: Page) {
  await page.route("**/api/v1/history**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET" || url.pathname !== "/api/v1/history") {
      await route.continue();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      json: createLargeHistoryResponse(LARGE_MESSAGE_COUNT),
    });
  });

  await page.goto("/workbench?codex-smoke=workbench-ready");
  const conversation = page.getByRole("button", { name: /Synthetic Session Alpha/ }).first();
  await expect(conversation).toBeVisible();
  const durationMs = await conversation.evaluate(
    (button, lastMessageText) =>
      new Promise<number>((resolveMetric, rejectMetric) => {
        const startedAt = performance.now();
        const timeout = window.setTimeout(() => {
          observer.disconnect();
          rejectMetric(new Error("Timed out waiting for the large message list initial render."));
        }, 10_000);
        const finishIfVisible = () => {
          const target = Array.from(
            document.querySelectorAll<HTMLElement>(".message-list .message-row"),
          ).find((row) => row.textContent?.includes(lastMessageText));
          if (!target) return;
          const bounds = target.getBoundingClientRect();
          if (bounds.width <= 0 || bounds.height <= 0) return;
          window.clearTimeout(timeout);
          observer.disconnect();
          resolveMetric(performance.now() - startedAt);
        };
        const observer = new MutationObserver(finishIfVisible);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        (button as HTMLElement).click();
        finishIfVisible();
      }),
    `Synthetic large message ${LARGE_MESSAGE_COUNT}`,
  );

  await expect(
    page.getByText(`Synthetic large message ${LARGE_MESSAGE_COUNT}`, { exact: true }),
  ).toBeVisible();
  const lastVirtualRowIndex = Number(
    await page
      .locator(".message-list__virtual-row")
      .filter({ hasText: `Synthetic large message ${LARGE_MESSAGE_COUNT}` })
      .getAttribute("data-index"),
  );
  expect(lastVirtualRowIndex).toBeGreaterThan(900);
  expect(await page.locator(".message-list__virtual-row[data-message-id]").count()).toBeLessThan(
    50,
  );
  return durationMs;
}

async function measureGraphCanvasFirstVisibleFrame(page: Page) {
  await page.goto("/graph?codex-smoke=workbench-ready");
  await expect(page.getByLabel("知识图谱模块")).toBeVisible();
  await page.getByRole("tab", { name: "可视化" }).click();
  const openVisualization = page.getByRole("button", { name: "打开可视化" });
  await expect(openVisualization).toBeEnabled();

  const startedAt = await openVisualization.evaluate((button) => {
    const startedAt = performance.now();
    (button as HTMLElement).click();
    return startedAt;
  });
  await expectGraphCanvasReady(page);
  return page.evaluate((startedAt) => performance.now() - startedAt, startedAt);
}

function createLargeHistoryResponse(count: number) {
  const timestamp = 1_767_254_400;
  return {
    chat: "session_synthetic_001",
    username: "session_synthetic_001",
    is_group: false,
    chat_type: "private",
    total_count: count,
    count,
    limit: count,
    offset: 0,
    query_since: timestamp,
    query_until: timestamp + count,
    query_range_label: "Synthetic runtime performance history",
    messages: Array.from({ length: count }, (_, index) => ({
      local_id: 20_000 + index,
      timestamp: timestamp + index,
      time: `2026-01-01 08:${String(index % 60).padStart(2, "0")}`,
      sender: index % 2 === 0 ? "contact_synthetic_001" : "self_synthetic",
      sender_name: index % 2 === 0 ? "Synthetic Contact Alpha" : "Synthetic Self",
      is_self: index % 2 === 1,
      type: "text",
      content: `Synthetic large message ${index + 1}`,
    })),
  };
}

function createFiftyHitSearchPage() {
  return {
    snapshot_id: "snapshot-runtime-performance-v2",
    data_revision: "revision-runtime-performance-v2",
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
      message_id: `runtime-performance-message-${index + 1}`,
      seq: index + 1,
      source_index: index,
      conversation_id: `runtime-performance-conversation-${(index % 4) + 1}`,
      conversation_name: `Synthetic performance conversation ${(index % 4) + 1}`,
      sender_id: `runtime-performance-sender-${(index % 6) + 1}`,
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
