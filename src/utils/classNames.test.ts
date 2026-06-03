import { describe, expect, it } from "vitest";
import { classNames } from "./classNames";

describe("classNames", () => {
  it("joins class names while dropping empty conditional values", () => {
    expect(classNames("base", false && "hidden", undefined, "", "active")).toBe("base active");
  });
});
