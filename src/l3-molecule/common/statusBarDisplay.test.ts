import { describe, expect, it } from "vitest";
import { formatSidecarPortLabel } from "./StatusBar";

describe("status bar display", () => {
  it("formats the sidecar port as a readable label", () => {
    expect(formatSidecarPortLabel(5030)).toBe("端口 5030");
  });
});
