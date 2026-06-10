import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const cssPath = "src/styles/layout.css";

function findRule(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));
  if (!match) {
    throw new Error(`Missing CSS rule for ${selector}`);
  }
  return match[1];
}

function readPxDeclaration(rule, property) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rule.match(new RegExp(`${escapedProperty}\\s*:\\s*([0-9.]+)px\\s*;`));
  if (!match) {
    throw new Error(`Missing ${property} declaration in ${rule}`);
  }
  return Number(match[1]);
}

async function readLayoutCss() {
  return readFile(cssPath, "utf8");
}

describe("UI target-size tokens", () => {
  it("keeps shared Button target sizes at project defaults", async () => {
    const css = await readLayoutCss();

    expect(readPxDeclaration(findRule(css, ".ui-button--sm"), "min-height")).toBeGreaterThanOrEqual(32);
    expect(readPxDeclaration(findRule(css, ".ui-button--md"), "min-height")).toBeGreaterThanOrEqual(40);
    expect(readPxDeclaration(findRule(css, ".ui-button--lg"), "min-height")).toBeGreaterThanOrEqual(44);
  });

  it("keeps shared IconButton target sizes at project defaults", async () => {
    const css = await readLayoutCss();

    const sm = findRule(css, ".ui-icon-button--sm");
    const md = findRule(css, ".ui-icon-button--md");
    const lg = findRule(css, ".ui-icon-button--lg");

    expect(readPxDeclaration(sm, "width")).toBeGreaterThanOrEqual(32);
    expect(readPxDeclaration(sm, "height")).toBeGreaterThanOrEqual(32);
    expect(readPxDeclaration(md, "width")).toBeGreaterThanOrEqual(36);
    expect(readPxDeclaration(md, "height")).toBeGreaterThanOrEqual(36);
    expect(readPxDeclaration(lg, "width")).toBeGreaterThanOrEqual(40);
    expect(readPxDeclaration(lg, "height")).toBeGreaterThanOrEqual(40);
  });

  it("keeps form controls and segmented controls above the project minimum", async () => {
    const css = await readLayoutCss();

    expect(readPxDeclaration(findRule(css, ".ui-control--sm"), "min-height")).toBeGreaterThanOrEqual(32);
    expect(readPxDeclaration(findRule(css, ".ui-control--md"), "min-height")).toBeGreaterThanOrEqual(40);
    expect(readPxDeclaration(findRule(css, ".ui-segmented__item"), "min-height")).toBeGreaterThanOrEqual(32);
  });
});
