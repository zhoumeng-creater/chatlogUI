import { expect, test } from "@playwright/test";
import { assertNoForbiddenVisibleText, installPrivacyLeakGuard } from "../utils/privacy-scan";
import { setDesktop, setNarrow } from "../utils/viewport";
import {
  enablePrivacyMode,
  expectDeveloperEntryHidden,
  expectStableSyntheticPage,
  openSyntheticWorkbench,
  openWorkbenchModule,
} from "../utils/workbench";

test.describe("privacy mode synthetic browser gate", () => {
  test("masks workbench, media, SNS, semantic, and graph primary workspaces", async ({ page }) => {
    const privacyGuard = installPrivacyLeakGuard(page);

    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await enablePrivacyMode(page);

    await expect(page.getByText("Synthetic Session Alpha")).toHaveCount(0);
    await expect(page.getByText(/\*{2,}/).first()).toBeVisible();

    await openWorkbenchModule(page, "媒体");
    await assertNoForbiddenVisibleText(page);

    await openWorkbenchModule(page, "朋友圈");
    await expect(page.getByText("已隐藏朋友圈内容").first()).toBeVisible();

    await openWorkbenchModule(page, "AI");
    await page.getByRole("button", { name: "AI 设置" }).click();
    await expect(page.getByText("语义设置")).toBeVisible();
    const endpointValues = await page
      .locator("#semantic-ollama-url, #semantic-glm-base-url, #semantic-deepseek-base-url")
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value).join("\n"));
    expect(endpointValues).toContain("已隐藏");
    expect(endpointValues).not.toMatch(/127\.0\.0\.1|api\.deepseek\.com|open\.bigmodel\.cn/i);
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await page.getByRole("button", { name: "预览" }).click();
    await expect(page.getByText("已隐藏对象").first()).toBeVisible();
    await page.getByRole("button", { name: "问答" }).click();
    const qaTextarea = page.locator(".qa-input__textarea");
    await expect(qaTextarea).toBeDisabled();
    await expect(qaTextarea).toHaveValue("");
    await expect(qaTextarea).not.toHaveAttribute("placeholder", /Synthetic|Chatroom|Session|Contact/i);
    await expect(page.getByRole("button", { name: /发送/ })).toBeDisabled();
    await expect(page.getByText("证据 1")).toHaveCount(0);
    await expect(page.getByText("Synthetic answer with evidence")).toHaveCount(0);
    await expect(page.locator(".qa-message__actions").getByRole("button", { name: "复制" })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "问答证据" })).toHaveCount(0);
    await expect(page.getByText("Synthetic Candidate")).toHaveCount(0);

    await openWorkbenchModule(page, "图谱");
    await page.getByRole("tab", { name: "问答" }).click();
    await expect(page.getByPlaceholder("隐私模式已隐藏问题草稿")).toBeDisabled();
    await expect(page.getByLabel("图谱问题")).toHaveValue("");

    await assertNoForbiddenVisibleText(page);
    await expectStableSyntheticPage(page);
    privacyGuard.assertNoLeaks();
  });

  test("keeps privacy-on narrow workbench free of page overflow", async ({ page }) => {
    const privacyGuard = installPrivacyLeakGuard(page);

    await setNarrow(page);
    await openSyntheticWorkbench(page);
    await enablePrivacyMode(page);

    await expect(page.getByLabel("会话列表").first()).toBeVisible();
    await expectDeveloperEntryHidden(page);
    for (const label of ["统计", "媒体", "朋友圈", "AI", "图谱"]) {
      await expect(page.getByRole("button", { name: `打开${label}` })).toBeVisible();
    }
    await expectStableSyntheticPage(page);
    privacyGuard.assertNoLeaks();
  });
});
