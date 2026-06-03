import { Radio, Trash2 } from "lucide-react";
import { Button, Spinner, Typography } from "@l4/ui";
import type { HookEventRowView } from "@l2/commander/hookViewModel";
import type { HookLoadStatus, HookStreamStatus } from "@l2/data-clerk/stores/useHookStore";
import { formatHookClearButtonCopy, formatHookContent, formatHookIdentity } from "./hookDisplay";

interface HookEventStreamProps {
  rows: HookEventRowView[];
  eventsStatus: HookLoadStatus;
  streamStatus: HookStreamStatus;
  clearStatus: HookLoadStatus;
  streamCopy: string;
  clearCopy: string;
  clearConfirmationPending: boolean;
  privacyOn: boolean;
  onStartStream: () => void;
  onStopStream: () => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
}

export function HookEventStream({
  rows,
  eventsStatus,
  streamStatus,
  clearStatus,
  streamCopy,
  clearCopy,
  clearConfirmationPending,
  privacyOn,
  onStartStream,
  onStopStream,
  onConfirmClear,
  onCancelClear,
}: HookEventStreamProps) {
  const streaming = streamStatus === "connecting" || streamStatus === "streaming";

  return (
    <section className="developer-section" aria-label="Hook 事件流">
      <div className="developer-section__header">
        <div>
          <Typography variant="label" weight={700}>
            Hook Events
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {streamCopy}
          </Typography>
        </div>
        <div className="developer-inline-actions">
          <Button
            variant={streaming ? "secondary" : "primary"}
            size="sm"
            onClick={streaming ? onStopStream : onStartStream}
          >
            <Radio size={14} />
            {streaming ? "停止" : "监听"}
          </Button>
          <Button
            variant={clearConfirmationPending ? "danger" : "ghost"}
            size="sm"
            loading={clearStatus === "loading"}
            onClick={onConfirmClear}
          >
            <Trash2 size={14} />
            {formatHookClearButtonCopy(clearConfirmationPending)}
          </Button>
          {clearConfirmationPending && (
            <Button variant="ghost" size="sm" onClick={onCancelClear}>
              取消
            </Button>
          )}
        </div>
      </div>
      <Typography variant="caption" color="var(--text-muted)">
        {clearCopy}
      </Typography>
      {eventsStatus === "loading" && <Spinner size={15} label="加载 Hook 事件..." color="var(--text-muted)" />}
      <div className="developer-hook-events">
        {rows.length === 0 ? (
          <Typography variant="caption" color="var(--text-muted)">
            暂无 Hook 事件。
          </Typography>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="developer-hook-event">
              <div>
                <Typography variant="label" weight={700}>
                  {formatHookIdentity(row, privacyOn)}
                </Typography>
                <Typography variant="caption" color="var(--text-muted)">
                  {row.ruleLabel || row.ruleType} · {row.triggerTime || row.createdAt}
                </Typography>
              </div>
              <Typography variant="body" color="var(--text-secondary)">
                {formatHookContent(row, privacyOn)}
              </Typography>
              <Typography variant="caption" color="var(--text-muted)">
                {row.deliveryLabel} · {row.contextLabel}
              </Typography>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
