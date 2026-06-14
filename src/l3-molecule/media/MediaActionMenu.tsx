import {
  CheckSquare,
  Copy,
  ExternalLink,
  Eye,
  LocateFixed,
  RotateCw,
  Square,
} from "lucide-react";
import type { ReactNode } from "react";
import { DisabledReason, IconButton } from "@l4/ui";
import type { MediaActionItem, MediaActionModel } from "@l2/commander/mediaActionModel";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";

interface MediaActionMenuProps {
  attachment: MediaAttachment;
  model: MediaActionModel;
  selected: boolean;
  onPreview: (attachment: MediaAttachment) => void;
  onCopySummary: (attachment: MediaAttachment) => void;
  onLocateSource: (attachment: MediaAttachment) => void;
  onRequestOpenOriginal: (attachment: MediaAttachment) => void;
  onRetryResource: (attachment: MediaAttachment) => void;
  onToggleSelected: (attachmentId: string) => void;
}

export function MediaActionMenu({
  attachment,
  model,
  selected,
  onPreview,
  onCopySummary,
  onLocateSource,
  onRequestOpenOriginal,
  onRetryResource,
  onToggleSelected,
}: MediaActionMenuProps) {
  return (
    <div className="media-action-menu" aria-label="媒体操作">
      <IconButton
        icon={selected ? <CheckSquare size={16} /> : <Square size={16} />}
        label={selected ? "取消选择媒体" : "选择媒体"}
        tooltip={selected ? "取消选择媒体" : "选择媒体"}
        size="md"
        active={selected}
        onClick={() => onToggleSelected(attachment.id)}
      />
      {renderActionButton(actionById(model, "preview"), <Eye size={16} />, "预览媒体", () => onPreview(attachment))}
      {renderActionButton(actionById(model, "copySummary"), <Copy size={16} />, "复制媒体摘要", () => onCopySummary(attachment))}
      {renderActionButton(actionById(model, "locateSource"), <LocateFixed size={16} />, "定位来源消息", () => onLocateSource(attachment))}
      {renderActionButton(actionById(model, "openOriginal"), <ExternalLink size={16} />, "打开原始资源", () => onRequestOpenOriginal(attachment))}
      {renderActionButton(actionById(model, "retryResource"), <RotateCw size={16} />, "重试资源预览", () => onRetryResource(attachment))}
    </div>
  );
}

function actionById(model: MediaActionModel, id: MediaActionItem["id"]): MediaActionItem {
  return model.actions.find((action) => action.id === id) ?? {
    id,
    label: id,
    enabled: false,
    disabledReason: "当前操作不可用。",
    requiresConfirmation: false,
  };
}

function renderActionButton(
  action: MediaActionItem,
  icon: ReactNode,
  label: string,
  onClick: () => void,
) {
  const button = (
    <IconButton
      icon={icon}
      label={label}
      tooltip={action.enabled ? action.label : action.disabledReason ?? action.label}
      size="md"
      disabled={!action.enabled}
      onClick={onClick}
    />
  );

  if (!action.disabledReason || action.enabled) return button;

  return (
    <DisabledReason
      key={action.id}
      reason={action.disabledReason}
      variant="sr-only"
      className="media-action-menu__disabled-reason"
    >
      {button}
    </DisabledReason>
  );
}
