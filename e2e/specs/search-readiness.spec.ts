import { expect, test, type Page, type Request } from "@playwright/test";

const SEARCH_APP_URL = process.env.SEARCH_PAGE_E2E_BASE_URL ?? "";

test("keeps search editable through real readiness recovery without submitting", async ({ page }) => {
  const healthGate = createGate();
  const dbGate = createGate();
  const healthStarted = createGate();
  const dbStarted = createGate();
  const searchRequests = captureRequests(page, "POST", "/api/v1/search");

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "chatlog_alpha_workspace_preferences",
      JSON.stringify({ coachMarksPausedUntil: 4_102_444_800_000 }),
    );
  });
  await page.route(/\/health\/?(?:\?.*)?$/, async (route) => {
    healthStarted.release();
    await healthGate.promise;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    });
  });
  await page.route(/\/api\/v1\/db\/?(?:\?.*)?$/, async (route) => {
    dbStarted.release();
    await dbGate.promise;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ready" }),
    });
  });

  await page.goto(`${SEARCH_APP_URL}/search`);
  await healthStarted.promise;
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByRole("region", { name: "搜索工作区" })).toBeVisible();
  await expect(page.locator(".app-statusbar")).toBeVisible();
  await expect(page.locator(".app-statusbar")).toContainText("本机服务未就绪");
  await expect(page.getByText("尚未配置", { exact: true })).toHaveCount(0);

  const input = page.getByRole("combobox", { name: "搜索聊天记录" });
  const submit = searchSubmit(page);
  await input.fill("cold start query");
  await expect(input).toHaveValue("cold start query");
  await expect(submit).toBeDisabled();
  await expect(page.getByText("请先配置本机聊天数据", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "前往数据设置" })).toBeVisible();

  await page.getByRole("button", { name: "全部消息类型" }).click();
  await page.getByRole("menu", { name: "消息类型" })
    .getByRole("menuitemcheckbox", { name: "文字" })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "文字", exact: true })).toBeVisible();
  expect(searchRequests).toHaveLength(0);

  healthGate.release();
  await dbStarted.promise;
  await expect(page.locator(".app-statusbar")).toContainText("本机服务就绪");
  await expect(page.locator(".app-statusbar")).toContainText("数据库初始化中");
  await expect(page.getByText("聊天数据库尚未就绪", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "重新加载数据库" })).toBeVisible();
  await expect(submit).toBeDisabled();

  await input.fill("cold start query refined");
  await expect(input).toHaveValue("cold start query refined");
  await page.getByRole("button", { name: "文字", exact: true }).click();
  const categoryMenu = page.getByRole("menu", { name: "消息类型" });
  await expect(categoryMenu.getByRole("menuitemcheckbox", { name: "图片与表情" })).toBeEnabled();
  await categoryMenu.getByRole("menuitemcheckbox", { name: "图片与表情" }).click();
  await page.keyboard.press("Escape");
  expect(searchRequests).toHaveLength(0);

  dbGate.release();
  await expect(page.locator(".app-statusbar")).toContainText("数据库就绪");
  await expect(submit).toBeEnabled();
  await expect(page.getByText("请先配置本机聊天数据", { exact: true })).toHaveCount(0);
  await expect(page.getByText("聊天数据库尚未就绪", { exact: true })).toHaveCount(0);

  await page.waitForTimeout(450);
  expect(searchRequests).toHaveLength(0);
  await expect(input).toHaveValue("cold start query refined");

  await page.setViewportSize({ width: 390, height: 820 });
  await expect(page.getByRole("region", { name: "搜索工作区" })).toBeVisible();
  await expect(page.locator(".app-statusbar")).toBeVisible();
  await expect(input).toBeEditable();
});

function searchSubmit(page: Page) {
  return page
    .getByRole("region", { name: "搜索工作区" })
    .getByRole("button", { name: /^(搜索|应用筛选)$/ });
}

function captureRequests(page: Page, method: string, pathname: string): Request[] {
  const requests: Request[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (request.method() === method && url.pathname === pathname) requests.push(request);
  });
  return requests;
}

function createGate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
