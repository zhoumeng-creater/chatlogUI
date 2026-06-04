import { expect, test } from "@playwright/test";
import { openSyntheticWorkbench } from "../utils/workbench";
import { hasPageHorizontalOverflow, setDesktop, setNarrow } from "../utils/viewport";

test("P3-C semantic discovery sends filters, navigates by backend chat, and filters preview", async ({ page }) => {
  await setDesktop(page);
  await openSyntheticWorkbench(page);
  await page.getByText("Synthetic Session Alpha").first().click();
  await page.getByRole("button", { name: "AI", exact: true }).click();
  const semanticPanel = page.getByLabel("语义发现");

  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await semanticPanel.getByLabel("范围").selectOption("selected");
  await semanticPanel.getByLabel("窗口").selectOption("30d");
  await semanticPanel.getByLabel("深度").selectOption("deep");
  await semanticPanel.getByLabel("候选").selectOption("25");

  const searchRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith("/api/v1/semantic/search") && url.searchParams.get("window") === "30d";
  });
  await semanticPanel.getByLabel("语义搜索").fill("synthetic");
  const searchUrl = new URL((await searchRequest).url());
  expect(searchUrl.searchParams.get("depth")).toBe("deep");
  expect(searchUrl.searchParams.get("source_limit")).toBe("25");
  expect(searchUrl.searchParams.get("chats")?.split(",")).toContain("session_synthetic_001");
  expect(searchUrl.searchParams.get("rerank")).toBe("true");
  expect(searchUrl.searchParams.has("scope")).toBe(false);

  await expect(page.getByText("Synthetic semantic search result")).toBeVisible();
  const historyRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith("/api/v1/history") && url.searchParams.has("chat");
  });
  await page.getByRole("button", { name: /Synthetic Session Alpha.*Synthetic Contact Alpha/s }).click();
  const historyUrl = new URL((await historyRequest).url());
  expect(historyUrl.searchParams.get("chat")).toBe("session_synthetic_001");
  expect(historyUrl.searchParams.get("chat")).not.toBe("Synthetic Session Alpha");

  await page.getByRole("button", { name: "预览", exact: true }).click();
  const previewRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith("/api/v1/semantic/index/preview") && url.searchParams.get("talker") === "session_synthetic_001";
  });
  await semanticPanel.getByLabel("会话").selectOption("session_synthetic_001");
  expect(new URL((await previewRequest).url()).searchParams.get("talker")).toBe("session_synthetic_001");
});

test("P3-C semantic discovery shows edge states at narrow width without page overflow", async ({ page }) => {
  await setNarrow(page);
  await page.route("**/api/v1/semantic/search**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query: "missing",
        source_count: 0,
        count: 0,
        window: "30d",
        depth: "deep",
        rerank: true,
        rerank_tried: true,
        rerank_applied: false,
        rerank_error: "synthetic rerank unavailable",
        results: [],
      }),
    });
  });
  await page.route("**/api/v1/semantic/topics**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        window: "30d",
        window_label: "Synthetic 30 days",
        count: 18,
        truncated: true,
        topics: [{ topic: "synthetic edge topic", count: 7, keywords: ["edge", "topic"] }],
        daily: [
          { date: "2026-06-04", count: 5 },
          { date: "2026-06-05", count: 8 },
        ],
        summary: "",
        summary_error: "synthetic summary unavailable",
      }),
    });
  });
  await page.route("**/api/v1/semantic/profiles**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        window: "30d",
        window_label: "Synthetic 30 days",
        count: 12,
        truncated: true,
        profiles: [
          {
            sender: "contact_synthetic_001",
            sender_name: "Synthetic Contact Alpha",
            messages: 9,
            top_keywords: [{ topic: "edge", count: 5 }],
          },
        ],
        type_distribution: [{ type: "text", count: 12 }],
        summary: "",
        summary_error: "synthetic profile summary unavailable",
      }),
    });
  });

  await openSyntheticWorkbench(page);
  await page.getByText("Synthetic Session Alpha").first().click();
  await page.getByRole("button", { name: "AI", exact: true }).click();
  const semanticPanel = page.getByLabel("语义发现");

  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await semanticPanel.getByLabel("语义搜索").fill("missing");
  await expect(page.getByText(/没有找到语义匹配结果。/)).toBeVisible();
  await expect(page.getByText(/重排失败：synthetic rerank unavailable/)).toBeVisible();

  await page.getByRole("button", { name: "分析", exact: true }).click();
  await expect(page.getByText("摘要生成失败：synthetic summary unavailable")).toBeVisible();
  await expect(page.getByText("摘要生成失败：synthetic profile summary unavailable")).toBeVisible();
  await expect(page.getByText("已截断").first()).toBeVisible();
  await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
});
