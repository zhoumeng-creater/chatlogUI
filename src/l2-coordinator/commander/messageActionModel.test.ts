import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import {
  buildMessageActionModel,
  getSafeRawFieldRows,
  serializeMessageAction,
} from "./messageActionModel";

const message: ChatMessage = {
  id: "wxid_synthetic_private-room_synthetic@chatroom-42",
  localId: 42,
  timestamp: 1_714_288_000,
  time: "2024-04-28 09:20",
  sender: "wxid_synthetic_private",
  senderName: "Synthetic Sender",
  talker: "room_synthetic@chatroom",
  talkerName: "Synthetic Room",
  isSelf: false,
  type: "text",
  subType: "plain",
  content: "Synthetic private message body",
  chat: "Synthetic Room",
  username: "room_synthetic@chatroom",
  isGroup: true,
  chatType: "group",
  mediaType: "file",
  mediaUrl: "file:///C:/private/secret.png",
  fileName: "secret.png",
  attachments: [{
    id: "a1",
    label: "Secret Image",
    kind: "image",
    resourceKind: "image",
    resourceKey: "synthetic-resource-key",
    redactedEndpointLabel: "media-resource",
    source: "history",
  }],
  direction: "other",
};

describe("messageActionModel", () => {
  it("offers expected row actions with disabled reasons", () => {
    const model = buildMessageActionModel({ message, privacyOn: false, similarSearchSupported: false });

    expect(model.actions.map((action) => action.id)).toEqual([
      "select-message",
      "copy-message",
      "copy-time",
      "copy-sender",
      "copy-markdown-quote",
      "jump-to-time",
      "find-similar",
      "view-safe-raw-fields",
      "copy-unmasked-message",
    ]);
    expect(model.actions.find((action) => action.id === "select-message")).toMatchObject({
      enabled: true,
      disabledReason: null,
    });
    expect(model.actions.find((action) => action.id === "find-similar")).toMatchObject({
      enabled: false,
      disabledReason: "当前后端暂不支持同类消息搜索。",
    });
  });

  it("serializes privacy-mode copies as masked by default", () => {
    expect(serializeMessageAction({
      actionId: "copy-message",
      message,
      privacyOn: true,
      unmaskedConfirmed: false,
    })).toEqual({
      ok: true,
      text: "********* ******* ******* ****",
      privacySafe: true,
    });
  });

  it("requires explicit confirmation for unmasked local copy", () => {
    expect(buildMessageActionModel({ message, privacyOn: true, unmaskedConfirmed: false })
      .actions.find((action) => action.id === "copy-unmasked-message"))
      .toMatchObject({
        enabled: false,
        requiresConfirmation: true,
        disabledReason: "隐私模式下需要确认后才能复制未脱敏内容。",
      });

    expect(serializeMessageAction({
      actionId: "copy-unmasked-message",
      message,
      privacyOn: true,
      unmaskedConfirmed: true,
    })).toMatchObject({
      ok: true,
      text: "Synthetic private message body",
      privacySafe: false,
    });
  });

  it("creates markdown quote, sender, and time copies", () => {
    expect(serializeMessageAction({
      actionId: "copy-markdown-quote",
      message,
      privacyOn: false,
      unmaskedConfirmed: false,
    }).text).toContain("> Synthetic private message body");
    expect(serializeMessageAction({
      actionId: "copy-time",
      message,
      privacyOn: false,
      unmaskedConfirmed: false,
    }).text).toBe("2024-04-28 09:20");
    expect(serializeMessageAction({
      actionId: "copy-sender",
      message,
      privacyOn: false,
      unmaskedConfirmed: false,
    }).text).toBe("Synthetic Sender");
  });

  it("allowlists safe raw fields and blocks content, paths, account ids, and resource keys", () => {
    const rows = getSafeRawFieldRows(message);
    const serialized = JSON.stringify(rows);

    expect(rows.map((row) => row.label)).toEqual([
      "本地 ID",
      "时间",
      "类型",
      "子类型",
      "方向",
      "媒体类型",
      "附件数量",
      "来源类型",
    ]);
    expect(serialized).not.toContain("Synthetic private message body");
    expect(serialized).not.toContain("file:///C:/private/secret.png");
    expect(serialized).not.toContain("wxid_synthetic_private-room_synthetic@chatroom-42");
    expect(serialized).not.toContain("wxid_synthetic_private");
    expect(serialized).not.toContain("room_synthetic@chatroom");
    expect(serialized).not.toContain("secret.png");
    expect(serialized).not.toContain("synthetic-resource-key");
  });
});
