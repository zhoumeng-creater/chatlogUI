import { SegmentedControl, Typography } from "@l4/ui";
import type { HermesQQDraft, HermesWeixinDraft, HookConfigDraft, HookConfigView } from "@l4/network";
import type { HookView } from "@l2/commander/hookViewModel";
import type { HookSubtab } from "@l2/data-clerk/stores/useHookStore";
import { HermesBridgePanel } from "./HermesBridgePanel";
import { HookConfigPanel } from "./HookConfigPanel";
import { HookEventStream } from "./HookEventStream";

interface HookConsoleProps {
  view: HookView;
  config: HookConfigView | null;
  privacyOn: boolean;
  clearConfirmationPending: boolean;
  onSubtabChange: (tab: HookSubtab) => void;
  onSaveConfig: (draft: Partial<HookConfigDraft> & Pick<HookConfigDraft, "notifyTargets">) => void;
  onRefreshHermes: () => void;
  onSaveHermesWeixin: (draft: HermesWeixinDraft) => void;
  onSaveHermesQQ: (draft: HermesQQDraft) => void;
  onStartStream: () => void;
  onStopStream: () => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
}

export function HookConsole({
  view,
  config,
  privacyOn,
  clearConfirmationPending,
  onSubtabChange,
  onSaveConfig,
  onRefreshHermes,
  onSaveHermesWeixin,
  onSaveHermesQQ,
  onStartStream,
  onStopStream,
  onConfirmClear,
  onCancelClear,
}: HookConsoleProps) {
  return (
    <div className="developer-hook">
      <section className="developer-section developer-section--top">
        <Typography variant="label" weight={700}>
          {view.statusSummary}
        </Typography>
        {view.errorCopy && (
          <Typography variant="caption" color="var(--danger)">
            {view.errorCopy}
          </Typography>
        )}
        <SegmentedControl
          label="Hook 子视图"
          value={view.activeSubtab}
          onChange={onSubtabChange}
          options={[
            { value: "events", label: "事件" },
            { value: "config", label: "配置" },
            { value: "bridges", label: "桥接" },
          ]}
        />
      </section>
      {view.activeSubtab === "events" && (
        <HookEventStream
          rows={view.eventRows}
          eventsStatus={view.eventsStatus}
          streamStatus={view.streamStatus}
          clearStatus={view.clearStatus}
          streamCopy={view.streamCopy}
          clearCopy={view.clearCopy}
          clearConfirmationPending={clearConfirmationPending}
          privacyOn={privacyOn}
          onStartStream={onStartStream}
          onStopStream={onStopStream}
          onConfirmClear={onConfirmClear}
          onCancelClear={onCancelClear}
        />
      )}
      {view.activeSubtab === "config" && (
        <HookConfigPanel
          config={config}
          view={view.config}
          privacyOn={privacyOn}
          loading={view.configStatus === "loading"}
          onSave={onSaveConfig}
        />
      )}
      {view.activeSubtab === "bridges" && (
        <HermesBridgePanel
          bridges={view.status?.bridges ?? []}
          privacyOn={privacyOn}
          saving={view.statusStatus === "loading"}
          onRefresh={onRefreshHermes}
          onSaveWeixin={onSaveHermesWeixin}
          onSaveQQ={onSaveHermesQQ}
        />
      )}
    </div>
  );
}
