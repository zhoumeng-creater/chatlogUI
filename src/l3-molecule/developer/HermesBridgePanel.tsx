import { useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { Button, DisabledReason, Input, Typography } from "@l4/ui";
import type { HermesQQDraft, HermesWeixinDraft } from "@l4/network";
import type { HermesBridgeView } from "@l2/commander/hookViewModel";
import {
  isHermesQQDraftComplete,
  isHermesWeixinDraftComplete,
} from "./hookDisplay";

interface HermesBridgePanelProps {
  bridges: HermesBridgeView[];
  privacyOn: boolean;
  saving: boolean;
  onRefresh: () => void;
  onSaveWeixin: (draft: HermesWeixinDraft) => void;
  onSaveQQ: (draft: HermesQQDraft) => void;
}

export function HermesBridgePanel({
  bridges,
  privacyOn,
  saving,
  onRefresh,
  onSaveWeixin,
  onSaveQQ,
}: HermesBridgePanelProps) {
  const [weixinDraft, setWeixinDraft] = useState<HermesWeixinDraft>({});
  const [qqDraft, setQQDraft] = useState<HermesQQDraft>({});
  const weixinBridge = bridgeFor(bridges, "weixin");
  const qqBridge = bridgeFor(bridges, "qq");
  const weixinDraftComplete = isHermesWeixinDraftComplete(weixinDraft);
  const qqDraftComplete = isHermesQQDraftComplete(qqDraft);
  const canSaveWeixin =
    !privacyOn &&
    !saving &&
    (weixinBridge?.editable ?? true) &&
    weixinDraftComplete;
  const canSaveQQ =
    !privacyOn &&
    !saving &&
    (qqBridge?.editable ?? true) &&
    qqDraftComplete;
  const privacyReasonId = privacyOn ? "developer-hermes-privacy-disabled-reason" : undefined;
  const weixinSaveReason = getHermesSaveDisabledReason({
    privacyOn,
    saving,
    bridge: weixinBridge,
    draftComplete: weixinDraftComplete,
  });
  const qqSaveReason = getHermesSaveDisabledReason({
    privacyOn,
    saving,
    bridge: qqBridge,
    draftComplete: qqDraftComplete,
  });
  const weixinSaveReasonId = weixinSaveReason ? "developer-hermes-weixin-save-disabled-reason" : undefined;
  const qqSaveReasonId = qqSaveReason ? "developer-hermes-qq-save-disabled-reason" : undefined;

  return (
    <section className="developer-section" aria-label="Hermes 桥接状态">
      <div className="developer-section__header">
        <div>
          <Typography variant="label" weight={700}>
            Hermes Bridges
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            企业微信 / QQ 桥接状态与配置保存
          </Typography>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw size={14} />
          刷新
        </Button>
      </div>
      <div className="developer-hermes-grid">
        <article className="developer-hermes-card">
          <HermesBridgeStatus bridge={weixinBridge} fallbackLabel="企业微信" />
          <div className="developer-param-grid developer-param-grid--dense">
            <label className="developer-field">
              <span>Hermes Home</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : weixinDraft.hermesHome ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setWeixinDraft((draft) => ({ ...draft, hermesHome: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏路径" : "C:/Hermes"}
              />
            </label>
            <label className="developer-field">
              <span>Account ID</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : weixinDraft.accountId ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setWeixinDraft((draft) => ({ ...draft, accountId: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏账号" : "account_id"}
              />
            </label>
            <label className="developer-field">
              <span>Token</span>
              <Input
                controlSize="sm"
                type="password"
                value={privacyOn ? "" : weixinDraft.token ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setWeixinDraft((draft) => ({ ...draft, token: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏 token" : "token"}
              />
            </label>
            <label className="developer-field">
              <span>Base URL</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : weixinDraft.baseUrl ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setWeixinDraft((draft) => ({ ...draft, baseUrl: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏 URL" : "https://qyapi.weixin.qq.com"}
              />
            </label>
            <label className="developer-field">
              <span>CDN URL</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : weixinDraft.cdnBaseUrl ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setWeixinDraft((draft) => ({ ...draft, cdnBaseUrl: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏 CDN" : "https://..."}
              />
            </label>
            <label className="developer-field">
              <span>Home Channel</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : weixinDraft.homeChannel ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setWeixinDraft((draft) => ({ ...draft, homeChannel: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏频道" : "channel id"}
              />
            </label>
            <label className="developer-field">
              <span>Channel Name</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : weixinDraft.homeChannelName ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setWeixinDraft((draft) => ({ ...draft, homeChannelName: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏频道名" : "general"}
              />
            </label>
          </div>
          {weixinSaveReason ? (
            <DisabledReason id={weixinSaveReasonId} reason={weixinSaveReason} variant="compact">
              <Button
                variant="secondary"
                size="sm"
                loading={saving}
                disabled={!canSaveWeixin}
                aria-describedby={weixinSaveReasonId}
                onClick={() => onSaveWeixin(weixinDraft)}
              >
                <Save size={14} />
                保存企业微信配置
              </Button>
            </DisabledReason>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={saving}
              disabled={!canSaveWeixin}
              aria-describedby={weixinSaveReasonId}
              onClick={() => onSaveWeixin(weixinDraft)}
            >
              <Save size={14} />
              保存企业微信配置
            </Button>
          )}
        </article>
        <article className="developer-hermes-card">
          <HermesBridgeStatus bridge={qqBridge} fallbackLabel="QQ" />
          <div className="developer-param-grid developer-param-grid--dense">
            <label className="developer-field">
              <span>Hermes Home</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : qqDraft.hermesHome ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setQQDraft((draft) => ({ ...draft, hermesHome: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏路径" : "C:/Hermes"}
              />
            </label>
            <label className="developer-field">
              <span>App ID</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : qqDraft.appId ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setQQDraft((draft) => ({ ...draft, appId: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏 App ID" : "app_id"}
              />
            </label>
            <label className="developer-field">
              <span>Client Secret</span>
              <Input
                controlSize="sm"
                type="password"
                value={privacyOn ? "" : qqDraft.clientSecret ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setQQDraft((draft) => ({ ...draft, clientSecret: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏密钥" : "client_secret"}
              />
            </label>
            <label className="developer-field">
              <span>Home Channel</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : qqDraft.homeChannel ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setQQDraft((draft) => ({ ...draft, homeChannel: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏频道" : "channel id"}
              />
            </label>
            <label className="developer-field">
              <span>Channel Name</span>
              <Input
                controlSize="sm"
                value={privacyOn ? "" : qqDraft.homeChannelName ?? ""}
                disabled={privacyOn}
                aria-describedby={privacyReasonId}
                onChange={(event) => setQQDraft((draft) => ({ ...draft, homeChannelName: event.currentTarget.value }))}
                placeholder={privacyOn ? "隐私模式已隐藏频道名" : "ops"}
              />
            </label>
          </div>
          {qqSaveReason ? (
            <DisabledReason id={qqSaveReasonId} reason={qqSaveReason} variant="compact">
              <Button
                variant="secondary"
                size="sm"
                loading={saving}
                disabled={!canSaveQQ}
                aria-describedby={qqSaveReasonId}
                onClick={() => onSaveQQ(qqDraft)}
              >
                <Save size={14} />
                保存 QQ 配置
              </Button>
            </DisabledReason>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={saving}
              disabled={!canSaveQQ}
              aria-describedby={qqSaveReasonId}
              onClick={() => onSaveQQ(qqDraft)}
            >
              <Save size={14} />
              保存 QQ 配置
            </Button>
          )}
        </article>
      </div>
      {privacyOn && (
        <DisabledReason
          id={privacyReasonId}
          reason="隐私模式下不可编辑 Hermes 配置。关闭隐私模式后可填写完整配置。"
          variant="inline"
        />
      )}
      <Typography variant="caption" color="var(--text-muted)">
        保存会全量覆盖 Hermes 渠道配置；为避免清空已隐藏的旧值，请填写完整的新配置后保存。
      </Typography>
    </section>
  );
}

function getHermesSaveDisabledReason({
  privacyOn,
  saving,
  bridge,
  draftComplete,
}: {
  privacyOn: boolean;
  saving: boolean;
  bridge: HermesBridgeView | null;
  draftComplete: boolean;
}): string | undefined {
  if (privacyOn) return "隐私模式下不可保存 Hermes 配置。关闭隐私模式后可填写完整配置。";
  if (saving) return "正在保存 Hermes 配置。保存完成后可再次提交。";
  if (bridge && !bridge.editable) return "当前桥接状态不允许保存配置。";
  if (!draftComplete) return "请填写完整配置后保存。";
  return undefined;
}

function HermesBridgeStatus({
  bridge,
  fallbackLabel,
}: {
  bridge: HermesBridgeView | null;
  fallbackLabel: string;
}) {
  return (
    <>
      <Typography variant="label" weight={700}>
        {bridge?.label ?? fallbackLabel}
      </Typography>
      <Typography variant="caption" color="var(--text-secondary)">
        {bridge ? `${bridge.installedLabel} · ${bridge.enabledLabel}` : "状态未加载"}
      </Typography>
      <Typography variant="caption" color="var(--text-muted)">
        {bridge
          ? `${bridge.credentialLabel} · ${bridge.channelLabel} · ${bridge.pathLabel}`
          : "刷新后可查看凭据、频道与路径状态"}
      </Typography>
      {bridge?.error && (
        <Typography variant="caption" color="var(--danger)">
          {bridge.error}
        </Typography>
      )}
    </>
  );
}

function bridgeFor(
  bridges: HermesBridgeView[],
  channel: HermesBridgeView["id"],
): HermesBridgeView | null {
  return bridges.find((bridge) => bridge.id === channel) ?? null;
}
