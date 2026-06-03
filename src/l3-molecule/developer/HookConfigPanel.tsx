import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button, Input, Typography } from "@l4/ui";
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
        <Button
          variant="secondary"
          size="sm"
          loading={loading}
          disabled={privacyOn || loading}
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
      </div>
      <div className="developer-field">
        <span>关键词</span>
        <Input
          controlSize="sm"
          value={privacyOn ? "" : keywordsText}
          disabled={privacyOn}
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
              onChange={(event) => setForwardChatroomsText(event.currentTarget.value)}
              placeholder={privacyOn ? "隐私模式已隐藏群聊草稿" : "room@chatroom"}
            />
          </label>
        </div>
      )}
      {privacyOn && (
        <Typography variant="caption" color="var(--text-muted)">
          隐私模式下仅显示脱敏配置摘要，关闭隐私模式后可编辑关键词、URL 和转发名单。
        </Typography>
      )}
    </section>
  );
}
