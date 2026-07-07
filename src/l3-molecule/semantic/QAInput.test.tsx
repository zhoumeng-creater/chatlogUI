import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QAInput } from "./QAInput";
import qaInputSource from "./QAInput.tsx?raw";

describe("QAInput", () => {
  it("explains why send is disabled before a question is entered", () => {
    const html = renderToStaticMarkup(
      <QAInput
        disabled={false}
        privacyOn={false}
        onSend={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.length).toBeGreaterThan(0);
    expect(descriptionIds.some((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain("先输入问题");
    expect(html).toContain("输入问题后可发送");
  });

  it("explains why selected-chat scope is unavailable when no recent chats exist", () => {
    const html = renderToStaticMarkup(
      <QAInput
        disabled={false}
        privacyOn={false}
        recentChats={[]}
        onSend={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(html).toContain("暂无可选会话");
    expect(html).toContain("选择至少一个会话后可使用选定范围");
  });

  it("explains why source controls are locked while streaming and keeps stop available", () => {
    const html = renderToStaticMarkup(
      <QAInput
        disabled
        privacyOn={false}
        currentContact="Synthetic Contact"
        recentChats={[{ chat: "synthetic-chat", label: "Synthetic Chat" }]}
        onSend={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(html).toContain("正在生成回答");
    expect(html).toContain("完成或停止后可修改范围");
    expect(html).toContain("停止");
    expect(html).toContain('class="ui-button ui-button--primary ui-button--sm qa-input__button"');
  });

  it("explains why semantic QA controls are disabled in privacy mode", () => {
    const html = renderToStaticMarkup(
      <QAInput
        disabled={false}
        privacyOn
        currentContact="Synthetic Contact"
        recentChats={[{ chat: "synthetic-chat", label: "Synthetic Chat" }]}
        onSend={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    const descriptionIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(descriptionIds.length).toBeGreaterThan(0);
    expect(descriptionIds.some((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toContain("ui-disabled-reason--inline");
    expect(html).toContain("隐私模式下不可提问");
    expect(html).toContain("关闭隐私模式后可继续问答");
  });

  it("uses the shared icon command tooltip for clearing entity override", () => {
    const html = renderToStaticMarkup(
      <QAInput
        disabled={false}
        privacyOn={false}
        entityOverride={{ value: "synthetic-entity", label: "Synthetic Entity" }}
        onClearEntityOverride={vi.fn()}
        onSend={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain("清除实体限定");
    expect(html).toContain('role="tooltip"');
    expect(html).not.toContain("title=");
  });

  it("does not render a raw entity override label after privacy mode is enabled", () => {
    const html = renderToStaticMarkup(
      <QAInput
        disabled={false}
        privacyOn
        entityOverride={{ value: "synthetic-entity", label: "Synthetic Secret Entity" }}
        onClearEntityOverride={vi.fn()}
        onSend={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(html).toContain("实体：已隐藏");
    expect(html).not.toContain("Synthetic Secret Entity");
  });

  it("uses the shared Select atom for source controls", () => {
    expect(qaInputSource).not.toContain("<select");
    expect(qaInputSource.match(/<Select/g) ?? []).toHaveLength(2);
  });
});
