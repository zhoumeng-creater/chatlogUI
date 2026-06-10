import { expect, type Page } from "@playwright/test";
import { assertNoForbiddenVisibleText } from "./privacy-scan";
import { hasPageHorizontalOverflow } from "./viewport";

export async function openSyntheticWorkbench(page: Page) {
  await page.goto("/workbench?codex-smoke=workbench-ready");
  await expect(page.getByLabel("会话列表").first()).toBeVisible();
}

export async function openWorkbenchModule(page: Page, label: string) {
  const target = getWorkspaceTarget(label);
  const railButton = page.getByRole("button", { name: target.ariaLabel });
  if (await railButton.count()) {
    await railButton.first().click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(target.href)}(?:[?#].*)?$`));
    return;
  }
  await openSyntheticWorkspace(page, target.href, { smoke: target.smoke });
}

export async function openSyntheticWorkspace(
  page: Page,
  href: string,
  options: { smoke?: boolean } = {},
) {
  await page.goto(withOptionalSmokeQuery(href, options.smoke ?? true));
}

export async function expectPrimaryWorkspaceRail(page: Page) {
  const rail = page.getByRole("navigation", { name: "就绪工作区导航" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("button", { name: "打开会话工作台" })).toBeVisible();
  await expect(rail.getByRole("button", { name: "打开搜索工作区" })).toBeVisible();
  await expect(rail.getByRole("button", { name: "打开媒体库" })).toBeVisible();
  await expect(rail.getByRole("button", { name: "打开朋友圈工作区" })).toBeVisible();
  await expect(rail.getByRole("button", { name: "打开统计分析" })).toBeVisible();
  await expect(rail.getByRole("button", { name: "打开 AI 工作台" })).toBeVisible();
  await expect(rail.getByRole("button", { name: "打开知识图谱" })).toBeVisible();
  await expect(page.getByRole("button", { name: "设置", exact: true })).toBeVisible();
  await expectDeveloperEntryHidden(page);
}

export async function expectDeveloperEntryHidden(page: Page) {
  await expect(page.getByRole("button", { name: "打开开发模块" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "开发", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "开发者控制台" })).toHaveCount(0);
}

export async function enablePrivacyMode(page: Page) {
  const button = page.getByRole("button", { name: "开启隐私模式" });
  if (await button.isVisible()) {
    await button.click();
  }
}

export async function expectStableSyntheticPage(page: Page) {
  await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
  await assertNoForbiddenVisibleText(page);
}

function getWorkspaceTarget(label: string): { href: string; ariaLabel: string; smoke?: boolean } {
  const targets: Record<string, { href: string; ariaLabel: string; smoke?: boolean }> = {
    会话: { href: "/workbench", ariaLabel: "打开会话工作台" },
    搜索: { href: "/search", ariaLabel: "打开搜索工作区" },
    统计: { href: "/analytics", ariaLabel: "打开统计分析" },
    媒体: { href: "/media", ariaLabel: "打开媒体库" },
    朋友圈: { href: "/sns", ariaLabel: "打开朋友圈工作区" },
    AI: { href: "/ai", ariaLabel: "打开 AI 工作台", smoke: false },
    图谱: { href: "/graph", ariaLabel: "打开知识图谱" },
  };
  const target = targets[label];
  if (!target) {
    throw new Error(`Unknown workspace target: ${label}`);
  }
  return target;
}

function withOptionalSmokeQuery(href: string, smoke: boolean) {
  if (!smoke) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}codex-smoke=workbench-ready`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
