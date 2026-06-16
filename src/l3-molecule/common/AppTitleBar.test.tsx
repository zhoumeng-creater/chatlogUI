import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppTitleBar } from "./AppTitleBar";

describe("AppTitleBar", () => {
  it("uses the product name instead of the diagnostic service name", () => {
    const html = renderToStaticMarkup(
      createElement(AppTitleBar, {
        productName: "chatlogUI",
        title: "工作台",
        status: createElement("span", null, "就绪"),
        actions: createElement("button", null, "操作"),
        windowControls: createElement("span", null, "窗口"),
      }),
    );

    expect(html).toContain("chatlogUI");
    expect(html).not.toContain("chatlog_alpha");
  });
});
