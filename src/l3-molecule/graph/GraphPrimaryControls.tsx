import { Download, Filter, RefreshCw, Search } from "lucide-react";
import { Button, DisabledReason, Input, Typography } from "@l4/ui";
import type { GraphControlModel } from "@l2/commander/graphControlModel";

interface GraphPrimaryControlsProps {
  model: GraphControlModel;
  keywordDraft: string;
  onKeywordDraftChange: (value: string) => void;
  onSubmit: () => void;
  onTimeWindowChange: (value: string) => void;
  onRefresh: () => void;
  onOpenAdvancedFilters: () => void;
  exportAction: {
    label: string;
    disabled: boolean;
    disabledReason: string | null;
    onClick: () => void;
  };
}

const TIME_OPTIONS = [
  { label: "全部", value: "" },
  { label: "近7天", value: "7d" },
  { label: "近30天", value: "30d" },
  { label: "近90天", value: "90d" },
];

export function GraphPrimaryControls({
  model,
  keywordDraft,
  onKeywordDraftChange,
  onSubmit,
  onTimeWindowChange,
  onRefresh,
  onOpenAdvancedFilters,
  exportAction,
}: GraphPrimaryControlsProps) {
  const activeTimeValue = model.primaryControls.find((control) => control.id === "time-window")?.value;
  const exportButton = (
    <Button
      variant="secondary"
      size="md"
      disabled={exportAction.disabled}
      onClick={exportAction.onClick}
      aria-describedby={exportAction.disabledReason ? "graph-export-disabled-reason" : undefined}
    >
      <Download size={16} />
      {exportAction.label}
    </Button>
  );

  return (
    <form
      className="graph-primary-controls"
      aria-label="图谱主控制"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="graph-primary-controls__search">
        <Typography variant="caption" weight={700}>
          搜索实体或关系
        </Typography>
        <Input
          variant="search"
          controlSize="md"
          name="graph-keyword"
          value={keywordDraft}
          onChange={(event) => onKeywordDraftChange(event.currentTarget.value)}
          placeholder="输入实体、关系或主题"
        />
      </label>

      <div className="graph-primary-controls__time" role="group" aria-label="图谱时间范围">
        {TIME_OPTIONS.map((option) => {
          const isActive = activeTimeValue === timeOptionLabel(option.value);
          return (
            <Button
              key={option.value}
              variant={isActive ? "primary" : "ghost"}
              size="md"
              onClick={() => onTimeWindowChange(option.value)}
              aria-pressed={isActive}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      <div className="graph-primary-controls__actions">
        <Button variant="primary" size="md" type="submit">
          <Search size={16} />
          应用筛选
        </Button>
        <Button variant="secondary" size="md" onClick={onRefresh}>
          <RefreshCw size={16} />
          刷新摘要
        </Button>
        <Button variant="ghost" size="md" onClick={onOpenAdvancedFilters}>
          <Filter size={16} />
          更多筛选
        </Button>
        {exportAction.disabledReason ? (
          <DisabledReason id="graph-export-disabled-reason" reason={exportAction.disabledReason} variant="compact">
            {exportButton}
          </DisabledReason>
        ) : exportButton}
      </div>

      <Typography variant="caption" color="var(--text-secondary)" className="graph-primary-controls__summary">
        {model.primarySummary}
      </Typography>
    </form>
  );
}

function timeOptionLabel(value: string): string {
  if (value === "7d") return "近 7 天";
  if (value === "30d") return "近 30 天";
  if (value === "90d") return "近 90 天";
  return "全部时间";
}
