import { CheckSquare, Copy, Download, X } from "lucide-react";
import { Button, DateInput, DisabledReason, Select, Typography } from "@l4/ui";
import type {
  MessageSelectionFilterModel,
  MessageSelectionFilterState,
} from "@/l2-coordinator/commander/conversationSelectionFilterModel";

interface MessageSelectionToolbarProps {
  selectedCount: number;
  privacyOn: boolean;
  summary: string;
  exportDisabledReason: string | null;
  filters: MessageSelectionFilterState;
  filterModel: MessageSelectionFilterModel;
  filterError: string | null;
  onSelectVisibleMessages: () => void;
  onFilterChange: (filters: Partial<MessageSelectionFilterState>) => void;
  onApplyFilters: () => void;
  onCopyMarkdown: () => void;
  onExportSelected: () => void;
  onCancel: () => void;
}

export function MessageSelectionToolbar({
  selectedCount,
  privacyOn,
  summary,
  exportDisabledReason,
  filters,
  filterModel,
  filterError,
  onSelectVisibleMessages,
  onFilterChange,
  onApplyFilters,
  onCopyMarkdown,
  onExportSelected,
  onCancel,
}: MessageSelectionToolbarProps) {
  const selectionDetail = getSelectionDetail(summary, selectedCount, privacyOn);
  const selectionEmptyReason = selectedCount === 0 ? "先勾选要操作的消息。" : null;

  return (
    <div className="message-selection-toolbar" role="toolbar" aria-label="消息选择工具栏">
      <div className="message-selection-toolbar__summary">
        <Typography className="message-selection-toolbar__eyebrow" variant="label" weight={800}>
          消息选择
        </Typography>
        <Typography className="message-selection-toolbar__meta" variant="caption" color="var(--text-secondary)">
          已选 {selectedCount.toLocaleString()} 条 · {selectionDetail}
        </Typography>
      </div>
      <div className="message-selection-toolbar__actions">
        <Button variant="ghost" size="sm" onClick={onSelectVisibleMessages}>
          <CheckSquare size={15} aria-hidden="true" />
          全选已加载
        </Button>
        <div className="message-selection-toolbar__filters" aria-label="选择导出范围">
          <label>
            <span>对象</span>
            <Select
              controlSize="sm"
              value={filters.sender}
              onChange={(event) => onFilterChange({ sender: event.currentTarget.value })}
            >
              {filterModel.senderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} · {option.count.toLocaleString()} 条
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>类型</span>
            <Select
              controlSize="sm"
              value={filters.messageType}
              onChange={(event) => onFilterChange({ messageType: event.currentTarget.value })}
            >
              {filterModel.typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} · {option.count.toLocaleString()} 条
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>开始</span>
            <DateInput
              controlSize="sm"
              value={filters.startDate}
              aria-invalid={Boolean(filterError)}
              onChange={(event) => onFilterChange({ startDate: event.currentTarget.value })}
            />
          </label>
          <label>
            <span>结束</span>
            <DateInput
              controlSize="sm"
              value={filters.endDate}
              aria-invalid={Boolean(filterError)}
              onChange={(event) => onFilterChange({ endDate: event.currentTarget.value })}
            />
          </label>
          <Button variant="ghost" size="sm" disabled={Boolean(filterError)} onClick={onApplyFilters}>
            按范围选择
          </Button>
        </div>
        {renderButton({
          label: "复制为 Markdown",
          disabledReason: selectionEmptyReason,
          icon: <Copy size={15} aria-hidden="true" />,
          onClick: onCopyMarkdown,
        })}
        {renderButton({
          label: "导出选中片段",
          disabledReason: selectionEmptyReason ?? exportDisabledReason,
          icon: <Download size={15} aria-hidden="true" />,
          onClick: onExportSelected,
        })}
        <Button variant="ghost" size="sm" aria-label="退出消息选择" onClick={onCancel}>
          <X size={15} aria-hidden="true" />
          退出选择
        </Button>
      </div>
      <Typography className="message-selection-toolbar__hint" variant="caption" color={filterError ? "var(--danger)" : "var(--text-muted)"}>
        {filterError ?? `范围选择只作用于当前已加载的 ${filterModel.loadedCount.toLocaleString()} 条消息。`}
      </Typography>
    </div>
  );
}

function renderButton({
  label,
  disabledReason,
  icon,
  onClick,
}: {
  label: string;
  disabledReason: string | null;
  icon: JSX.Element;
  onClick: () => void;
}) {
  const button = (
    <Button
      variant="secondary"
      size="sm"
      disabled={Boolean(disabledReason)}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );

  if (!disabledReason) return button;

  return (
    <DisabledReason reason={disabledReason}>
      {button}
    </DisabledReason>
  );
}

function getSelectionDetail(summary: string, selectedCount: number, privacyOn: boolean): string {
  const privacyText = privacyOn ? "隐私模式：脱敏" : "隐私模式：关闭";
  const countPrefix = `已选 ${selectedCount.toLocaleString()} 条`;
  const normalized = summary.trim();
  const detail = normalized.startsWith(`${countPrefix} · `)
    ? normalized.slice(`${countPrefix} · `.length)
    : normalized === countPrefix
      ? ""
      : normalized;

  return detail ? `${privacyText} · ${detail}` : privacyText;
}
