import { Filter, X } from "lucide-react";
import { Button, Typography } from "@l4/ui";
import type { SnsFilterCapability, SnsFilterChip, SnsFilterField } from "@l2/commander/snsFilterModel";

interface SnsFilterChipsProps {
  chips: SnsFilterChip[];
  dirty: boolean;
  filtersOpen?: boolean;
  onClear: (field: SnsFilterField) => void;
  onOpenFilters: () => void;
}

export function SnsFilterChips({
  chips,
  dirty,
  filtersOpen = false,
  onClear,
  onOpenFilters,
}: SnsFilterChipsProps) {
  return (
    <div className="sns-filter-strip" aria-label="朋友圈筛选摘要">
      <Button type="button" variant="secondary" size="sm" onClick={onOpenFilters} aria-expanded={filtersOpen}>
        <Filter size={14} />
        打开筛选
      </Button>
      <div className="sns-filter-strip__chips" aria-live="polite">
        {chips.length === 0 ? (
          <Typography variant="caption" color="var(--text-secondary)">
            当前显示全部朋友圈动态
          </Typography>
        ) : (
          chips.map((chip) => (
            <span key={chip.id} className="sns-filter-chip" aria-label={chip.ariaLabel}>
              <span className="sns-filter-chip__label">{chip.label}</span>
              <strong>{chip.value}</strong>
              <em>{capabilityText(chip.capability)}</em>
              {chip.clearable && (
                <button
                  type="button"
                  className="sns-filter-chip__clear"
                  data-hit-target="32"
                  onClick={() => onClear(chip.field)}
                  aria-label={`清除${chip.label}筛选`}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))
        )}
      </div>
      {dirty && (
        <span className="sns-filter-strip__dirty" role="status">
          筛选未应用
        </span>
      )}
    </div>
  );
}

function capabilityText(capability: SnsFilterCapability): string {
  if (capability === "backend-applied") return "接口筛选";
  if (capability === "request-on-apply") return "应用后请求";
  return "本地筛选";
}
