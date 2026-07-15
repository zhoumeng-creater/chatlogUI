import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export async function expectNoCriticalA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  const serious = result.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious"
  );

  expect(summarizeViolations(serious)).toEqual([]);
}

export async function expectNoA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(summarizeViolations(result.violations)).toEqual([]);
}

function summarizeViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    }));
}
