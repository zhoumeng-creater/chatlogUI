import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SnsExternalOpenDialog } from "./SnsExternalOpenDialog";

describe("SnsExternalOpenDialog", () => {
  it("confirms external article opens with a safe domain summary only", () => {
    const html = renderToStaticMarkup(
      <SnsExternalOpenDialog
        prompt={{
          postId: "post-1",
          title: "Synthetic Article",
          domain: "article.synthetic.invalid",
          scheme: "https",
        }}
        error={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain("打开外部文章");
    expect(html).toContain("HTTPS · article.synthetic.invalid");
    expect(html).toContain("不会显示完整 URL、参数或密钥");
    expect(html).not.toContain("/private/path");
    expect(html).not.toContain("sns-secret-key");
    expect(html).not.toContain("sns-token");
  });
});
