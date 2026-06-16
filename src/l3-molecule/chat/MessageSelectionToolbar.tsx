import { Bot, Copy, Download, Network, X } from "lucide-react";
import { Button, DisabledReason, IconButton, Typography } from "@l4/ui";

interface MessageSelectionToolbarProps {
  selectedCount: number;
  privacyOn: boolean;
  summary: string;
  exportDisabledReason: string | null;
  aiDisabledReason: string | null;
  graphDisabledReason: string | null;
  onCopyMarkdown: () => void;
  onExportSelected: () => void;
  onSendToAi: () => void;
  onCreateGraphContext: () => void;
  onCancel: () => void;
}

export function MessageSelectionToolbar({
  selectedCount,
  privacyOn,
  summary,
  exportDisabledReason,
  aiDisabledReason,
  graphDisabledReason,
  onCopyMarkdown,
  onExportSelected,
  onSendToAi,
  onCreateGraphContext,
  onCancel,
}: MessageSelectionToolbarProps) {
  return (
    <div className="message-selection-toolbar" role="toolbar" aria-label="消息选择工具栏">
      <div className="message-selection-toolbar__summary">
        <Typography variant="label" weight={700}>
          已选 {selectedCount.toLocaleString()} 条
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {privacyOn ? "隐私模式：脱敏" : "隐私模式：关闭"} · {summary}
        </Typography>
      </div>
      <div className="message-selection-toolbar__actions">
        <Button variant="secondary" size="sm" onClick={onCopyMarkdown}>
          <Copy size={15} aria-hidden="true" />
          复制为 Markdown
        </Button>
        {renderButton({
          label: "导出选中片段",
          disabledReason: exportDisabledReason,
          icon: <Download size={15} aria-hidden="true" />,
          onClick: onExportSelected,
        })}
        {renderButton({
          label: "发送到 AI",
          disabledReason: aiDisabledReason,
          icon: <Bot size={15} aria-hidden="true" />,
          onClick: onSendToAi,
        })}
        {renderButton({
          label: "创建图谱上下文",
          disabledReason: graphDisabledReason,
          icon: <Network size={15} aria-hidden="true" />,
          onClick: onCreateGraphContext,
        })}
        <IconButton
          icon={<X size={16} />}
          label="取消选择"
          tooltip="取消选择"
          size="md"
          onClick={onCancel}
        />
      </div>
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
    <DisabledReason reason={disabledReason} variant="compact">
      {button}
    </DisabledReason>
  );
}
