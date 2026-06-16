import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchStatusAnnouncer } from "./SearchStatusAnnouncer";

describe("SearchStatusAnnouncer", () => {
  it("announces searching, found, empty, cancelled and failed states", () => {
    const privateQuery = "invoice dataKey=secret123 C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private";

    expect(renderToStaticMarkup(
      <SearchStatusAnnouncer status="loading" loading totalCount={0} loadedCount={0} query={privateQuery} />,
    )).toContain("正在搜索");

    expect(renderToStaticMarkup(
      <SearchStatusAnnouncer status="loading" loading totalCount={0} loadedCount={0} query={privateQuery} />,
    )).not.toContain("invoice");
    expect(renderToStaticMarkup(
      <SearchStatusAnnouncer status="loading" loading totalCount={0} loadedCount={0} query={privateQuery} />,
    )).not.toContain("secret123");
    expect(renderToStaticMarkup(
      <SearchStatusAnnouncer status="loading" loading totalCount={0} loadedCount={0} query={privateQuery} />,
    )).not.toContain("C:\\Users\\Synthetic");

    expect(renderToStaticMarkup(
      <SearchStatusAnnouncer status="ready" loading={false} totalCount={8} loadedCount={3} query="invoice" />,
    )).toContain("已加载 3 / 共 8 条搜索结果");

    expect(renderToStaticMarkup(
      <SearchStatusAnnouncer status="empty" loading={false} totalCount={0} loadedCount={0} query="invoice" />,
    )).toContain("没有找到搜索结果");

    expect(renderToStaticMarkup(
      <SearchStatusAnnouncer status="cancelled" loading={false} totalCount={0} loadedCount={0} query="invoice" />,
    )).toContain("搜索已取消");

    expect(renderToStaticMarkup(
      <SearchStatusAnnouncer status="error" loading={false} totalCount={0} loadedCount={0} query="invoice" />,
    )).toContain("搜索失败");
  });
});
