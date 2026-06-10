import { defineConfig, devices } from "@playwright/test";

const appUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const appOrigin = new URL(appUrl);
const appHost = appOrigin.hostname;
const appPort = appOrigin.port || (appOrigin.protocol === "https:" ? "443" : "80");
const mockSidecarUrl = "http://127.0.0.1:5030/health?format=json";
const reuseMockSidecarServer = process.env.PLAYWRIGHT_REUSE_MOCK_SERVER === "1";

export default defineConfig({
  testDir: "e2e/specs",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.03,
    },
  },
  outputDir: "output/playwright/test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/playwright/report", open: "never" }],
  ],
  use: {
    baseURL: appUrl,
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: `pnpm exec vite --host ${appHost} --port ${appPort} --strictPort`,
      url: appUrl,
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "node e2e/mock-chatlog-server/server.mjs",
      url: mockSidecarUrl,
      reuseExistingServer: reuseMockSidecarServer,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
