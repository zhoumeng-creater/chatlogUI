import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SnsTimeline } from "./SnsTimeline";
import type { AdaptedSnsPost } from "./snsTypes";

describe("SnsTimeline", () => {
  it("renders privacy-safe media previews in comfortable reading mode", () => {
    const html = renderToStaticMarkup(
      <SnsTimeline
        posts={[post()]}
        selectedPostId={null}
        privacyOn={false}
        density="comfortable"
        emptyCopy="暂无朋友圈动态"
        onSelectPost={vi.fn()}
      />,
    );

    expect(html).toContain("sns-post-row__media-preview");
    expect(html).toContain("图片");
    expect(html).not.toContain("https://media.synthetic.invalid/raw.jpg");
  });

  it("keeps compact rows dense by hiding media previews", () => {
    const html = renderToStaticMarkup(
      <SnsTimeline
        posts={[post()]}
        selectedPostId={null}
        privacyOn={false}
        density="compact"
        emptyCopy="暂无朋友圈动态"
        onSelectPost={vi.fn()}
      />,
    );

    expect(html).not.toContain("sns-post-row__media-preview");
  });
});

function post(): AdaptedSnsPost {
  return {
    id: "post-1",
    timestamp: 1,
    time: "2026-01-02 09:00",
    author: { username: "post-1-user", displayName: "Synthetic Author" },
    content: "Synthetic content",
    contentType: "image",
    media: [
      {
        id: "media-1",
        kind: "image",
        redactedEndpointLabel: "sns:media-proxy",
        sensitiveSrc: "https://media.synthetic.invalid/raw.jpg",
        sensitiveThumbSrc: "https://media.synthetic.invalid/thumb.jpg",
      },
    ],
    mediaCount: 1,
    locationSummary: "",
    article: null,
    finder: null,
    hasRawContent: false,
  };
}
