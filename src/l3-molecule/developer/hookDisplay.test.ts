import { describe, expect, it } from "vitest";
import {
  formatHookClearButtonCopy,
  formatHookContent,
  formatHookIdentity,
  isHermesQQDraftComplete,
  isHermesWeixinDraftComplete,
} from "./hookDisplay";

describe("hookDisplay", () => {
  it("hides Hook identity and content in privacy mode", () => {
    expect(formatHookIdentity({ identityLabel: "private-user" }, true)).toBe("已隐藏对象");
    expect(formatHookContent({ contentPreview: "Synthetic private content" }, true)).toBe("已隐藏内容");
  });

  it("requires explicit clear confirmation copy", () => {
    expect(formatHookClearButtonCopy(false)).toBe("清空事件");
    expect(formatHookClearButtonCopy(true)).toBe("确认清空");
  });

  it("requires complete Hermes drafts before privacy-safe saves", () => {
    expect(isHermesWeixinDraftComplete({
      hermesHome: "C:/Hermes",
      accountId: "account",
      token: "token",
      baseUrl: "https://qyapi.weixin.qq.com",
      cdnBaseUrl: "https://cdn.synthetic.invalid",
      homeChannel: "1001",
      homeChannelName: "general",
    })).toBe(true);
    expect(isHermesWeixinDraftComplete({ token: "token" })).toBe(false);

    expect(isHermesQQDraftComplete({
      hermesHome: "C:/Hermes",
      appId: "app",
      clientSecret: "secret",
      homeChannel: "2002",
      homeChannelName: "ops",
    })).toBe(true);
    expect(isHermesQQDraftComplete({ clientSecret: "secret" })).toBe(false);
  });
});
