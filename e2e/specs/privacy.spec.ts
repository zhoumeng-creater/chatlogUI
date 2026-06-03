import { expect, test } from "@playwright/test";
import { assertNoForbiddenVisibleText, installPrivacyLeakGuard } from "../utils/privacy-scan";
import { setDesktop, setNarrow } from "../utils/viewport";
import {
  enablePrivacyMode,
  expectStableSyntheticPage,
  openSyntheticWorkbench,
  openWorkbenchModule,
} from "../utils/workbench";

test.describe("privacy mode synthetic browser gate", () => {
  test("masks workbench, media, SNS, developer, semantic, and graph surfaces", async ({ page }) => {
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

    await openWorkbenchModule(page, "开发");
    await expect(page.getByText("已隐藏数据库文件").first()).toBeVisible();
    await page.getByRole("button", { name: "Hook" }).click();
    await expect(page.getByText("已隐藏内容").first()).toBeVisible();

    await openWorkbenchModule(page, "AI");
    await page.getByRole("button", { name: "预览" }).click();
    await expect(page.getByText("已隐藏对象").first()).toBeVisible();

    await openWorkbenchModule(page, "图谱");
    await expect(page.getByPlaceholder("隐私模式已隐藏问题草稿")).toBeVisible();

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
    for (const label of ["统计", "媒体", "朋友圈", "开发", "AI", "图谱"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveCSS("white-space", "nowrap");
    }
    await expectStableSyntheticPage(page);
    privacyGuard.assertNoLeaks();
  });
});
