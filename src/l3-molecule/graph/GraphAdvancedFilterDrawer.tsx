import { useCallback, useEffect, useRef } from "react";
import type { HTMLInputTypeAttribute, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button, Input, Typography } from "@l4/ui";
import type { GraphControlModel } from "@l2/commander/graphControlModel";
import {
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
} from "@l4/ui/overlayFocus";

interface GraphAdvancedFilterDrawerProps {
  open: boolean;
  model: GraphControlModel;
  entityDraft: string;
  relationDraft: string;
  limitDraft: string;
  startDraft: string;
  endDraft: string;
  hasUnappliedChanges: boolean;
  onEntityDraftChange: (value: string) => void;
  onRelationDraftChange: (value: string) => void;
  onLimitDraftChange: (value: string) => void;
  onStartDraftChange: (value: string) => void;
  onEndDraftChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function GraphAdvancedFilterDrawer({
  open,
  model,
  entityDraft,
  relationDraft,
  limitDraft,
  startDraft,
  endDraft,
  hasUnappliedChanges,
  onEntityDraftChange,
  onRelationDraftChange,
  onLimitDraftChange,
  onStartDraftChange,
  onEndDraftChange,
  onApply,
  onReset,
  onClose,
}: GraphAdvancedFilterDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = typeof document === "undefined" ? null : document.activeElement;
    const timer = window.setTimeout(() => focusInitialOverlayTarget(panelRef.current), 0);
    return () => {
      window.clearTimeout(timer);
      restoreFocusTarget(openerRef.current);
      openerRef.current = null;
    };
  }, [open]);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (shouldCloseOverlayOnKey(event.key, { dismissible: true })) {
      event.stopPropagation();
      onClose();
      return;
    }
    trapOverlayFocus(panelRef.current, document.activeElement, event);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="graph-advanced-filter-drawer">
      <div
        className="graph-advanced-filter-drawer__panel"
        {...getOverlayDialogProps({ titleId: "graph-advanced-filter-title" })}
        ref={panelRef}
        onKeyDown={handleKeyDown}
      >
        <div className="graph-advanced-filter-drawer__head">
          <div>
            <Typography id="graph-advanced-filter-title" variant="label" weight={700}>
              图谱高级筛选
            </Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {hasUnappliedChanges ? "有未应用更改" : model.advancedSummary}
            </Typography>
          </div>
          <Button variant="ghost" size="md" onClick={onClose}>
            关闭
          </Button>
        </div>

        <div className="graph-advanced-filter-drawer__grid">
          <LabeledInput label="实体类型" value={entityDraft} onChange={onEntityDraftChange} placeholder="person / topic / event" />
          <LabeledInput label="关系类型" value={relationDraft} onChange={onRelationDraftChange} placeholder="mentions / owns / causes" />
          <LabeledInput label="数量上限" type="number" min={1} max={300} value={limitDraft} onChange={onLimitDraftChange} />
          <LabeledInput label="开始日期" type="date" value={startDraft} onChange={onStartDraftChange} />
          <LabeledInput label="结束日期" type="date" value={endDraft} onChange={onEndDraftChange} />
        </div>

        <div className="graph-advanced-filter-drawer__actions">
          <Button variant="primary" size="md" onClick={onApply}>
            应用筛选
          </Button>
          <Button variant="secondary" size="md" onClick={onReset}>
            重置筛选
          </Button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <label className="graph-advanced-filter-drawer__field">
      <Typography variant="caption" weight={700}>
        {label}
      </Typography>
      <Input
        controlSize="md"
        type={type}
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
