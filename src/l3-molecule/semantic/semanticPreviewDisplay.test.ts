import { describe, expect, it } from "vitest";
import { formatSemanticPreviewContent, formatSemanticPreviewIdentity } from "./semanticPreviewDisplay";

describe("semanticPreviewDisplay", () => {
  it("keeps semantic preview identity and content hidden", () => {
    expect(formatSemanticPreviewIdentity({ identityLabel: "private-user" }, true)).toBe("已隐藏对象");
    expect(formatSemanticPreviewContent({ contentPreview: "Synthetic private content" }, true)).toBe("已隐藏内容");
  });
});
