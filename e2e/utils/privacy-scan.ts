import { expect, type Page } from "@playwright/test";

const FORBIDDEN_VISIBLE_PATTERNS = [
  /synthetic-data-key-redaction-case/i,
  /sk-synthetic-redaction-case/i,
  /synthetic-token-redaction-case/i,
  /synthetic-bearer-redaction-case/i,
  /synthetic-vector-store-redaction-target/i,
  /synthetic-token-redaction-target/i,
  /synthetic-client-secret-redaction-target/i,
  /Synthetic hook trigger content for redaction tests only/i,
  /Synthetic context content for redaction tests only/i,
  /Synthetic streaming trigger content for redaction tests only/i,
  /Synthetic semantic preview content for redaction tests only/i,
  /Synthetic semantic outlier content for redaction tests only/i,
  /Synthetic graph answer for redaction tests only/i,
  /Synthetic evidence summary for redaction tests only/i,
  /C:\\Users\\Synthetic/i,
  /dataKey=/i,
  /body_file/i,
  /remote_host/i,
  /raw_headers/i,
  /raw_path/i,
  /\/api\/v1\/sns\/media\/proxy\?/i,
];

export async function assertNoForbiddenVisibleText(page: Page) {
  const snapshot = await collectVisiblePrivacySnapshot(page);
  assertNoForbiddenText(snapshot, "visible and accessible UI");
}

export function installPrivacyLeakGuard(page: Page) {
  const browserOutput: string[] = [];

  page.on("console", (message) => {
    browserOutput.push(`[console:${message.type()}] ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    browserOutput.push(`[pageerror] ${error.message}`);
  });

  return {
    assertNoLeaks() {
      assertNoForbiddenText(browserOutput.join("\n"), "browser console and page errors");
    },
  };
}

function assertNoForbiddenText(snapshot: string, source: string) {
  for (const pattern of FORBIDDEN_VISIBLE_PATTERNS) {
    expect(snapshot, `Forbidden privacy pattern reached ${source}: ${pattern}`).not.toMatch(pattern);
  }
}

async function collectVisiblePrivacySnapshot(page: Page) {
  return page.evaluate(() => {
    const attributes = Array.from(
      document.querySelectorAll<HTMLElement>("[aria-label],[title],img[alt]"),
    ).flatMap((element) => [
      element.getAttribute("aria-label") ?? "",
      element.getAttribute("title") ?? "",
      element.getAttribute("alt") ?? "",
    ]);

    return [document.body.innerText, ...attributes].join("\n");
  });
}
