import { expect, test } from "@playwright/test";
import { assertNoForbiddenVisibleText, installPrivacyLeakGuard } from "../utils/privacy-scan";
import { enablePrivacyMode, openSyntheticWorkbench, openWorkbenchModule } from "../utils/workbench";
import { setDesktop } from "../utils/viewport";

test.describe("P3-E privacy diagnostics closeout", () => {
  test("keeps privacy-on semantic and graph form values out of the DOM and diagnostics copy", async ({
    context,
    page,
  }) => {
    const privacyGuard = installPrivacyLeakGuard(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:5173",
    });

    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await enablePrivacyMode(page);

    await openWorkbenchModule(page, "AI");
    const qaTextarea = page.locator(".qa-input__textarea");
    await expect(qaTextarea).toBeDisabled();
    await expect(qaTextarea).toHaveValue("");
    await expect(qaTextarea).not.toHaveAttribute(
      "placeholder",
      /Synthetic|Chatroom|Session|Contact/i,
    );

    await openWorkbenchModule(page, "图谱");
    await page.getByRole("tab", { name: "高级" }).click();
    await expect(page.getByPlaceholder("隐私模式已隐藏问题草稿").first()).toBeDisabled();
    await page.getByRole("tab", { name: "问答" }).click();
    await expect(page.getByLabel("图谱问题")).toBeDisabled();
    await expect(page.getByLabel("图谱问题")).toHaveValue("");

    await assertNoForbiddenVisibleText(page);
    privacyGuard.assertNoLeaks();

    await page.goto("/settings");
    await page.getByRole("button", { name: "关于与更新" }).click();
    await page.getByRole("button", { name: "查看脱敏诊断" }).click();
    await page.getByRole("button", { name: "复制诊断" }).click();
    await expect(page.getByRole("button", { name: "已复制" })).toBeVisible();
    const copiedDiagnostics = await page.evaluate(() => navigator.clipboard.readText());

    for (const marker of [
      "Synthetic semantic question for redaction tests only",
      "Synthetic semantic answer for redaction tests only",
      "Synthetic semantic evidence for redaction tests only",
      "Synthetic graph question for redaction tests only",
      "Synthetic graph answer for redaction tests only",
      "Synthetic graph entity for redaction tests only",
      "Synthetic graph ingest content for redaction tests only",
    ]) {
      expect(copiedDiagnostics).not.toContain(marker);
    }
    expect(copiedDiagnostics).toContain("Export manifest version: 2.0");
  });
});
