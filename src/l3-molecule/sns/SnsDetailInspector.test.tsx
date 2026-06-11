import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SnsDetailInspector } from "./SnsDetailInspector";
import type { AdaptedSnsPost } from "./snsTypes";

describe("SnsDetailInspector", () => {
  it("offers article opening through safe domain copy without exposing the raw URL", () => {
    const post = snsPost();
    Object.defineProperty(post.article, "sensitiveExternalUrl", {
      value: "https://article.synthetic.invalid/private/path?token=sns-token&key=sns-secret-key",
      enumerable: false,
    });

    const html = renderToStaticMarkup(
      <SnsDetailInspector
        post={post}
        privacyOn={false}
        onRequestArticleOpen={vi.fn()}
      />,
    );

    expect(html).toContain("打开文章");
    expect(html).toContain("HTTPS · article.synthetic.invalid");
    expect(html).not.toContain("/private/path");
    expect(html).not.toContain("sns-token");
    expect(html).not.toContain("sns-secret-key");
  });
});

function snsPost(): AdaptedSnsPost {
  return {
    id: "post-1",
    timestamp: 1,
    time: "2026-01-02 09:00",
    author: { username: "sns_author", displayName: "Synthetic Author" },
    content: "Synthetic content",
    contentType: "article",
    media: [],
    mediaCount: 0,
    locationSummary: "",
    article: {
      title: "Synthetic Article",
      description: "Synthetic description",
      hasExternalUrl: true,
      externalDomain: "article.synthetic.invalid",
      externalScheme: "https",
    },
    finder: null,
    hasRawContent: false,
  };
}
