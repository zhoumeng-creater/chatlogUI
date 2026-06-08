import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button, DisabledReason, Input, Typography } from "@l4/ui";
import type { HookConfigDraft, HookConfigView, HookNotifyTargets } from "@l4/network";
import type { HookConfigViewModel } from "@l2/commander/hookViewModel";

interface HookConfigPanelProps {
  config: HookConfigView | null;
  view: HookConfigViewModel | null;
  privacyOn: boolean;
  loading: boolean;
  onSave: (draft: Partial<HookConfigDraft> & Pick<HookConfigDraft, "notifyTargets">) => void;
}

const DEFAULT_TARGETS: HookNotifyTargets = {
  mcp: true,
  post: false,
  weixin: false,
  qq: false,
};

export function HookConfigPanel({
  config,
  view,
  privacyOn,
  loading,
  onSave,
}: HookConfigPanelProps) {
  const [keywordsText, setKeywordsText] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [beforeCount, setBeforeCount] = useState(5);
  const [afterCount, setAfterCount] = useState(5);
  const [forwardAll, setForwardAll] = useState(false);
  const [forwardContactsText, setForwardContactsText] = useState("");
  const [forwardChatroomsText, setForwardChatroomsText] = useState("");
  const [notifyTargets, setNotifyTargets] = useState<HookNotifyTargets>(DEFAULT_TARGETS);

  useEffect(() => {
    if (!config) return;
    setKeywordsText(config.keywords.join(", "));
    setBeforeCount(config.beforeCount);
    setAfterCount(config.afterCount);
    setForwardAll(config.forwardAll);
    setNotifyTargets(config.notifyTargets);
  }, [config]);

  const updateTarget = (target: keyof HookNotifyTargets, enabled: boolean) => {
    setNotifyTargets((current) => ({ ...current, [target]: enabled }));
  };
  const validationReason = getHookSaveValidationReason(config, {
    postUrl,
    forwardAll,
    forwardContactsText,
    forwardChatroomsText,
  });
  const saveReason = privacyOn
    ? "隐私模式下不可保存 Hook 配置。关闭隐私模式后可编辑并保存。"
    : loading
      ? "正在保存 Hook 配置。保存完成后可再次提交。"
      : validationReason;
  const saveReasonId = saveReason ? "developer-hook-save-disabled-reason" : undefined;
  const privacyReasonId = privacyOn ? "developer-hook-privacy-disabled-reason" : undefined;
  const saveDisabled = privacyOn || loading || Boolean(validationReason);

  return (
    <section className="developer-section" aria-label="Hook 配置">
      <div className="developer-section__header">
        <div>
          <Typography variant="label" weight={700}>
            Hook Config
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view ? `${view.keywordsCount} keywords · ${view.contextWindow}` : "配置未加载"}
          </Typography>
        </div>
        {saveReason ? (
          <DisabledReason id={saveReasonId} reason={saveReason} variant="compact">
            <Button
              variant="secondary"
              size="sm"
              loading={loading}
              disabled={saveDisabled}
              aria-describedby={saveReasonId}
              onClick={() =>
                onSave({
                  keywordsText,
                  notifyTargets,
                  postUrl,
                  beforeCount,
                  afterCount,
                  forwardAll,
                  forwardContactsText,
                  forwardChatroomsText,
                })
              }
            >
              <Save size={14} />
              保存
            </Button>
          </DisabledReason>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            loading={loading}
            disabled={saveDisabled}
            aria-describedby={saveReasonId}
            onClick={() =>
              onSave({
                keywordsText,
                notifyTargets,
                postUrl,
                beforeCount,
                afterCount,
                forwardAll,
                forwardContactsText,
                forwardChatroomsText,
              })
            }
          >
            <Save size={14} />
            保存
          </Button>
        )}
      </div>
      <div className="developer-field">
        <span>关键词</span>
        <Input
          controlSize="sm"
          value={privacyOn ? "" : keywordsText}
          disabled={privacyOn}
          aria-describedby={privacyReasonId}
          onChange={(event) => setKeywordsText(event.currentTarget.value)}
          placeholder={privacyOn ? "隐私模式已隐藏关键词草稿" : "keyword1, keyword2"}
        />
      </div>
      <div className="developer-hook-targets">
        {Object.entries(notifyTargets).map(([target, enabled]) => (
          <label key={target} className="developer-toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => updateTarget(target as keyof HookNotifyTargets, event.currentTarget.checked)}
            />
            <span>{target.toUpperCase()}</span>
          </label>
        ))}
      </div>
      <div className="developer-param-grid">
        <label className="developer-field">
          <span>POST URL</span>
          <Input
            controlSize="sm"
            value={privacyOn ? "" : postUrl}
            disabled={privacyOn}
            aria-describedby={privacyReasonId}
            onChange={(event) => setPostUrl(event.currentTarget.value)}
            placeholder={privacyOn ? "隐私模式已隐藏 URL 草稿" : view?.postUrlLabel ?? "optional"}
          />
        </label>
        <label className="developer-field">
          <span>Before</span>
          <Input
            controlSize="sm"
            type="number"
            min={0}
            max={50}
            value={beforeCount}
            onChange={(event) => setBeforeCount(Number(event.currentTarget.value))}
          />
        </label>
        <label className="developer-field">
          <span>After</span>
          <Input
            controlSize="sm"
            type="number"
            min={0}
            max={50}
            value={afterCount}
            onChange={(event) => setAfterCount(Number(event.currentTarget.value))}
          />
        </label>
        <label className="developer-toggle">
          <input
            type="checkbox"
            checked={forwardAll}
            onChange={(event) => setForwardAll(event.currentTarget.checked)}
          />
          <span>全部转发</span>
        </label>
      </div>
      {!forwardAll && (
        <div className="developer-param-grid">
          <label className="developer-field">
            <span>Contacts</span>
            <Input
              controlSize="sm"
              value={privacyOn ? "" : forwardContactsText}
              disabled={privacyOn}
              aria-describedby={privacyReasonId}
              onChange={(event) => setForwardContactsText(event.currentTarget.value)}
              placeholder={privacyOn ? "隐私模式已隐藏联系人草稿" : "wxid, remark"}
            />
          </label>
          <label className="developer-field">
            <span>Chatrooms</span>
            <Input
              controlSize="sm"
              value={privacyOn ? "" : forwardChatroomsText}
              disabled={privacyOn}
              aria-describedby={privacyReasonId}
              onChange={(event) => setForwardChatroomsText(event.currentTarget.value)}
              placeholder={privacyOn ? "隐私模式已隐藏群聊草稿" : "room@chatroom"}
            />
          </label>
        </div>
      )}
      {privacyOn && (
        <DisabledReason
          id={privacyReasonId}
          reason="隐私模式下仅显示脱敏配置摘要，关闭隐私模式后可编辑关键词、URL 和转发名单。"
          variant="inline"
        />
      )}
    </section>
  );
}

function getHookSaveValidationReason(
  config: HookConfigView | null,
  draft: Pick<
    HookConfigDraft,
    "postUrl" | "forwardAll" | "forwardContactsText" | "forwardChatroomsText"
  >,
): string | undefined {
  if (!config) return undefined;
  if (config.postUrlConfigured && !(draft.postUrl ?? "").trim()) {
    return "POST 目标已配置，但当前表单没有新的 POST URL。请输入完整 POST URL 后再保存，避免清空现有目标。";
  }
  if (draft.forwardAll) return undefined;
  if (config.forwardContactCount > 0 && !(draft.forwardContactsText ?? "").trim()) {
    return "联系人转发名单已配置，但当前表单没有新的联系人名单。请输入完整联系人名单后再保存，避免清空现有名单。";
  }
  if (config.forwardChatroomCount > 0 && !(draft.forwardChatroomsText ?? "").trim()) {
    return "群聊转发名单已配置，但当前表单没有新的群聊名单。请输入完整群聊名单后再保存，避免清空现有名单。";
  }
  return undefined;
}
