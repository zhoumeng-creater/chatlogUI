import { describe, expect, it } from "vitest";
import {
  getControlClassName,
  getFieldDescriptionId,
  getSegmentedItemClassName,
} from "./formControl";

describe("formControl", () => {
  it("builds tokenized control classes without glass-specific names", () => {
    expect(getControlClassName("input", "md")).toBe("ui-control ui-control--input ui-control--md");
    expect(getControlClassName("select", "sm", "extra")).toBe("ui-control ui-control--select ui-control--sm extra");
  });

  it("marks active segmented items with aria-compatible styling classes", () => {
    expect(getSegmentedItemClassName(true)).toBe("ui-segmented__item ui-segmented__item--active");
    expect(getSegmentedItemClassName(false)).toBe("ui-segmented__item");
  });

  it("creates stable helper ids for field descriptions", () => {
    expect(getFieldDescriptionId("data-dir", "hint")).toBe("data-dir-hint");
    expect(getFieldDescriptionId(undefined, "error")).toBeUndefined();
  });
});
