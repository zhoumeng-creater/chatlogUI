import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MediaPreviewSheet } from "./MediaPreviewSheet";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";

describe("MediaPreviewSheet", () => {
  it("uses the shared icon command pattern for closing media preview", () => {
    const html = renderToStaticMarkup(
      <MediaPreviewSheet
        attachment={attachment()}
        resourceUrl="/api/v1/media/synthetic"
        privacyOn={false}
        onClose={vi.fn()}
      />,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain('aria-label="关闭媒体预览"');
    expect(html).toContain('role="tooltip"');
    expect(html).not.toContain("title=");
  });
});

function attachment(): MediaAttachment {
  return {
    id: "media-1",
    kind: "image",
    resourceKind: "image",
    resourceKey: "synthetic-key",
    label: "Synthetic image",
    redactedEndpointLabel: "media image",
    source: "history",
  };
}
