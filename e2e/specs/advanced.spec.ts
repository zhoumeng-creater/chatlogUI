import { expect, test } from "@playwright/test";
import { setDesktop } from "../utils/viewport";
import { expectGraphCanvasReady } from "../utils/graph";
import {
  enableDeveloperEntryForTest,
  expectStableSyntheticPage,
  openSyntheticWorkbench,
  openWorkbenchModule,
} from "../utils/workbench";

test.describe("advanced synthetic modules", () => {
  test.beforeEach(async ({ page }) => {
    await enableDeveloperEntryForTest(page);
    await setDesktop(page);
    await openSyntheticWorkbench(page);
  });

  test("opens media and SNS modules with synthetic fixture data", async ({ page }) => {
    await openWorkbenchModule(page, "媒体");
    await expect(page.getByRole("complementary", { name: "媒体与扩展" }).first()).toBeVisible();
    await expect(page.getByText("媒体与扩展").first()).toBeVisible();
    await expectStableSyntheticPage(page);

    await openWorkbenchModule(page, "朋友圈");
    await expect(page.getByRole("complementary", { name: "朋友圈" }).first()).toBeVisible();
    await expect(page.getByText("Synthetic SNS image post content")).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("opens Developer DB/API/Hook/MCP surfaces", async ({ page }) => {
    await openWorkbenchModule(page, "开发");
    await expect(page.getByRole("complementary", { name: "开发者工具" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "DB Explorer" })).toBeVisible();
    await page.getByRole("button", { name: /MSG0\.db message/ }).click();
    await expect(page.getByText("SyntheticMessages")).toBeVisible();

    await page.getByRole("button", { name: "API Runner" }).click();
    await expect(page.getByLabel("本机 API 调试器")).toBeVisible();
    await expect(page.getByText("local-sidecar allowlist")).toBeVisible();

    await page.getByRole("button", { name: "Hook" }).click();
    await expect(page.getByLabel("Hook 事件流")).toBeVisible();
    await page.getByRole("button", { name: "监听" }).click();
    await expect(page.getByText("Hook Events")).toBeVisible();

    await page.getByRole("button", { name: "MCP" }).click();
    await expect(page.getByText("MCP Inventory")).toBeVisible();
    await expect(page.getByLabel("MCP 工具")).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("opens semantic preview and graph visualization flows", async ({ page }) => {
    await openWorkbenchModule(page, "AI");
    await expect(page.getByLabel("语义索引中心")).toBeVisible();
    await expect(page.getByText("索引已就绪")).toBeVisible();
    await expect(page.getByLabel("语义索引指标")).toBeVisible();

    await page.getByRole("button", { name: "AI 设置" }).click();
    await expect(page.getByText("语义设置")).toBeVisible();
    await expect(page.getByLabel("Embedding Provider")).toBeVisible();
    await expect(page.getByLabel("GLM API Key")).toBeVisible();
    await page.getByText("高级参数").click();
    await page.getByLabel("索引并发").fill("5");
    await page.getByRole("button", { name: "保存配置" }).click();
    await expect(page.getByRole("dialog", { name: "确认高并发索引？" })).toBeVisible();
    await page.getByRole("button", { name: "取消" }).click();
    await page.getByRole("button", { name: "测试连接" }).click();
    await expect(page.getByText(/Connection succeeded/)).toBeVisible();
    await page.getByRole("button", { name: "保存配置" }).click();
    await expect(page.getByRole("dialog", { name: "确认高并发索引？" })).toBeVisible();
    await page.getByRole("button", { name: "确认保存" }).click();
    await expect(page.getByText("语义设置")).toHaveCount(0);

    await page.getByRole("button", { name: "从头重建" }).click();
    await expect(page.getByRole("dialog", { name: "确认从头重建索引？" })).toBeVisible();
    await page.getByRole("button", { name: "取消" }).click();
    await page.getByRole("button", { name: "删除索引" }).click();
    await expect(page.getByRole("dialog", { name: "确认删除语义索引？" })).toBeVisible();
    await page.getByRole("button", { name: "确认" }).click();

    await expect(page.getByRole("button", { name: "搜索" })).toBeVisible();
    await page.getByRole("button", { name: "搜索" }).click();
    await page.getByLabel("语义搜索").fill("synthetic semantic discovery");
    await expect(page.getByText("1 条结果 / 2 条候选 / 7d / standard / rerank 已应用")).toBeVisible();
    const semanticResult = page.locator(".semantic-search__results").getByRole("button", { name: /Synthetic Session Alpha/ });
    await expect(semanticResult).toBeVisible();
    await semanticResult.click();
    await expect(page.getByLabel("会话工作区").getByText("Synthetic message for UI state only")).toBeVisible();

    await page.getByRole("button", { name: "分析" }).click();
    await expect(page.getByText("Synthetic topics summary")).toBeVisible();
    await expect(page.getByText("synthetic topic summary warning")).toBeVisible();
    await expect(page.getByText("Synthetic profiles summary")).toBeVisible();
    await expect(page.getByText("synthetic profile summary warning")).toBeVisible();
    await expect(page.getByRole("button", { name: "询问此发送者" })).toBeVisible();

    await expect(page.getByRole("button", { name: "预览" })).toBeVisible();
    await page.getByRole("button", { name: "预览" }).click();
    const preview = page.getByLabel("语义索引预览");
    await expect(preview).toBeVisible();
    await expect(page.getByText("synthetic-embedding-model")).toBeVisible();
    await preview.getByLabel("会话").selectOption("session_synthetic_001");
    await expect(page.getByText("synthetic-embedding-model")).toBeVisible();

    await openWorkbenchModule(page, "图谱");
    await expect(page.getByLabel("知识图谱模块")).toBeVisible();
    await expect(page.getByLabel("图谱列表")).toBeVisible();
    const relationRow = page.getByRole("button", {
      name: /Synthetic Entity Alpha mentioned Synthetic Topic Alpha/,
    });
    await expect(relationRow).toBeVisible();
    await relationRow.click();
    await expect(page.getByRole("complementary", { name: "图谱详情" })).toContainText("验证");
    await expect(page.getByRole("complementary", { name: "图谱详情" })).toContainText("已支持");

    await page.getByRole("tab", { name: "时间线" }).click();
    const timelineRow = page.getByRole("button", { name: /Synthetic timeline event/ });
    await expect(timelineRow).toBeVisible();
    await timelineRow.click();
    await expect(page.getByRole("complementary", { name: "图谱详情" })).toContainText("时间");

    await page.getByRole("tab", { name: "高级" }).click();
    const graphAdvancedPanel = page.getByLabel("图谱高级能力");
    await expect(graphAdvancedPanel).toContainText("管理操作");
    await expect(graphAdvancedPanel.getByRole("button", { name: /重置重建/ })).toBeVisible();

    await page.getByRole("tab", { name: "可视化" }).click();
    await expect(page.getByRole("button", { name: "打开可视化" })).toBeEnabled();
    await page.getByRole("button", { name: "打开可视化" }).click();
    await expect(page.getByLabel("知识图谱可视化")).toBeVisible();
    await expectGraphCanvasReady(page);
    const canvasBox = await page.locator(".graph-canvas__stage canvas").first().boundingBox();
    expect(canvasBox?.width ?? 0).toBeGreaterThanOrEqual(520);
    await expectStableSyntheticPage(page);

    await page.getByRole("tab", { name: "问答" }).click();
    await expect(page.getByRole("region", { name: "图谱问答面板" })).toBeVisible();
    await page.getByLabel("图谱问题").fill("synthetic graph qa");
    await page.getByRole("button", { name: "提问" }).click();
    await expect(page.getByRole("button", { name: "确认提问" })).toBeVisible();
    await page.getByRole("button", { name: "确认提问" }).click();
    await expect(page.getByText("Synthetic graph answer for redaction tests only")).toBeVisible();
    await expect(page.getByText("2 条证据已隐藏")).toBeVisible();
  });

  test("streams semantic QA with selected conversations, evidence, retry, and empty/failure states", async ({ page }) => {
    await openWorkbenchModule(page, "AI");
    await expect(page.getByLabel("语义索引中心")).toBeVisible();

    await page.getByLabel("问答范围").getByLabel("选定会话", { exact: true }).check();
    await page.getByLabel("选定会话列表").getByLabel("Synthetic Session Alpha").check();
    await page.getByLabel("问答数据源").getByLabel("上下文").check();
    await page.locator(".qa-input__textarea").fill("synthetic completed qa");
    await page.getByRole("button", { name: /发送/ }).click();

    await expect(page.getByText("Synthetic answer with evidence")).toBeVisible();
    await expect(page.getByText("证据 1")).toBeVisible();
    await page.getByRole("button", { name: "证据" }).click();
    await expect(page.getByRole("complementary", { name: "问答证据" })).toBeVisible();
    await expect(page.getByText("Synthetic evidence summary for QA fixture only")).toBeVisible();
    await expect(page.getByText("Synthetic Candidate")).toBeVisible();
    await page.getByRole("button", { name: "关闭证据" }).click();

    await page.getByRole("button", { name: "重试" }).click();
    await expect(page.getByText("Synthetic answer with evidence")).toHaveCount(2);

    await page.locator(".qa-input__textarea").fill("synthetic empty qa");
    await page.getByRole("button", { name: /发送/ }).click();
    await expect(page.getByText("synthetic empty answer")).toBeVisible();

    await page.locator(".qa-input__textarea").fill("synthetic failure qa");
    await page.getByRole("button", { name: /发送/ }).click();
    await expect(page.locator(".qa-panel__status--failed")).toContainText("synthetic semantic QA failed");

    await expectStableSyntheticPage(page);
  });
});
