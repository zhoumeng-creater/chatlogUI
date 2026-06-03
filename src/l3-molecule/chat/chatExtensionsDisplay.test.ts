import { describe, expect, it } from "vitest";
import type { ChatMember } from "@l2/data-clerk/stores/useChatStore";
import {
  formatMemberDisplay,
  formatNewMessagesStatus,
} from "./chatExtensionsDisplay";

describe("chatExtensionsDisplay", () => {
  it("masks member display in privacy mode but preserves owner role", () => {
    const member: ChatMember = {
      id: "member_synthetic_owner",
      username: "member_synthetic_owner",
      display: "Synthetic Owner",
      isOwner: true,
    };

    expect(formatMemberDisplay(member, false)).toBe("Synthetic Owner（群主）");
    expect(formatMemberDisplay(member, true)).toBe("成员已隐藏（群主）");
  });

  it("summarizes new message refresh states", () => {
    expect(formatNewMessagesStatus("idle", 0)).toBe("尚未刷新新消息");
    expect(formatNewMessagesStatus("loading", 0)).toBe("正在刷新新消息");
    expect(formatNewMessagesStatus("ready", 3)).toBe("新增 3 条消息");
    expect(formatNewMessagesStatus("empty", 0)).toBe("没有新消息");
    expect(formatNewMessagesStatus("error", 0)).toBe("新消息刷新失败");
  });
});
