import type { ReactNode } from "react";
import type {
  StatsControlViewModel,
  StatsGranularity,
  StatsObjectFilter,
  StatsTimePreset,
} from "@l2/commander/statsControlModel";
import { Button, DisabledReason, Typography } from "@l4/ui";

interface StatsControlBarProps {
  model: StatsControlViewModel;
  exportAction: ReactNode;
  onSelectTimePreset: (preset: StatsTimePreset) => void;
  onSelectGranularity: (granularity: StatsGranularity) => void;
  onSelectObjectFilter: (filter: StatsObjectFilter) => void;
  onCustomRangeChange: (range: { start: string; end: string }) => void;
  onRefresh: () => void;
  onReset: () => void;
  onToggleComparison: () => void;
}

export function StatsControlBar({
  model,
  exportAction,
  onSelectTimePreset,
  onSelectGranularity,
  onSelectObjectFilter,
  onCustomRangeChange,
  onRefresh,
  onReset,
  onToggleComparison,
}: StatsControlBarProps) {
  const customSelected = model.timeOptions.some((option) => option.value === "custom" && option.selected);

  return (
    <section className="stats-control-bar" aria-label="统计控制">
      <div className="stats-control-bar__header">
        <div>
          <Typography variant="label" weight={700}>统计控制</Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            当前导出范围：{model.exportScopeSummary}
          </Typography>
        </div>
        <div className="stats-control-bar__actions">
          <Button variant="secondary" size="md" loading={model.pending} onClick={onRefresh}>
            刷新统计
          </Button>
          <Button variant="ghost" size="md" disabled={!model.canReset || model.pending} onClick={onReset}>
            重置统计控制
          </Button>
          {exportAction}
        </div>
      </div>

      <div className="stats-control-bar__groups">
        <ControlGroup label="时间">
          {model.timeOptions.map((option) => (
            <ReasonedButton
              key={option.value}
              selected={option.selected}
              disabled={option.disabled || model.pending}
              disabledReason={option.disabledReason}
              onClick={() => onSelectTimePreset(option.value)}
            >
              {option.label}
            </ReasonedButton>
          ))}
        </ControlGroup>

        <ControlGroup label="粒度">
          {model.granularityOptions.map((option) => (
            <ReasonedButton
              key={option.value}
              selected={option.selected}
              disabled={option.disabled || model.pending}
              disabledReason={option.disabledReason}
              onClick={() => onSelectGranularity(option.value)}
            >
              {option.label}
            </ReasonedButton>
          ))}
        </ControlGroup>

        <ControlGroup label="对象">
          {model.objectOptions.map((option) => (
            <ReasonedButton
              key={option.value}
              selected={option.selected}
              disabled={option.disabled || model.pending}
              disabledReason={option.disabledReason}
              onClick={() => onSelectObjectFilter(option.value)}
            >
              {option.label}
            </ReasonedButton>
          ))}
        </ControlGroup>

        <ControlGroup label="比较">
          <ReasonedButton
            selected={model.comparison.enabled}
            disabled={model.comparison.disabled || model.pending}
            disabledReason={model.comparison.disabledReason}
            onClick={onToggleComparison}
          >
            {model.comparison.label}
          </ReasonedButton>
        </ControlGroup>
      </div>

      {customSelected && (
        <div className="stats-control-bar__custom-range" aria-label="自定义时间范围">
          <label>
            <span>开始日期</span>
            <input
              type="date"
              value={model.customRange.start}
              aria-invalid={Boolean(model.customRangeError)}
              onChange={(event) => onCustomRangeChange({
                start: event.currentTarget.value,
                end: model.customRange.end,
              })}
            />
          </label>
          <label>
            <span>结束日期</span>
            <input
              type="date"
              value={model.customRange.end}
              aria-invalid={Boolean(model.customRangeError)}
              onChange={(event) => onCustomRangeChange({
                start: model.customRange.start,
                end: event.currentTarget.value,
              })}
            />
          </label>
          {model.customRangeError && (
            <Typography variant="caption" color="var(--danger)" role="alert">
              {model.customRangeError}
            </Typography>
          )}
        </div>
      )}

      {model.warnings.length > 0 && (
        <div className="stats-control-bar__warnings" role="status">
          {model.warnings.map((warning) => (
            <Typography key={warning} variant="caption" color="var(--text-secondary)">
              {warning}
            </Typography>
          ))}
        </div>
      )}
    </section>
  );
}

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="stats-control-bar__group" role="toolbar" aria-label={label}>
      <Typography variant="caption" color="var(--text-secondary)" weight={700}>
        {label}
      </Typography>
      <div className="stats-control-bar__buttons">{children}</div>
    </div>
  );
}

function ReasonedButton({
  selected,
  disabled,
  disabledReason,
  onClick,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  disabledReason: string | null;
  onClick: () => void;
  children: string;
}) {
  const button = (
    <Button
      variant={selected ? "secondary" : "ghost"}
      size="md"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  if (!disabled || !disabledReason) return button;
  return (
    <DisabledReason reason={disabledReason} variant="compact">
      {button}
    </DisabledReason>
  );
}
