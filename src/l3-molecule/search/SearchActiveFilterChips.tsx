import { X } from "lucide-react";
import type {
  SearchActiveFilterChip,
  SearchAdvancedFilterField,
} from "@l2/commander/searchAdvancedFilters";
import { IconButton } from "@l4/ui";

interface SearchActiveFilterChipsProps {
  chips: SearchActiveFilterChip[];
  onClear: (field: SearchAdvancedFilterField) => void;
}

export function SearchActiveFilterChips({ chips, onClear }: SearchActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="search-active-filter-chips" aria-label="高级筛选条件">
      {chips.map((chip) => (
        <span key={chip.id} className="search-active-filter-chips__chip">
          <span>{chip.label}：{chip.value}</span>
          <IconButton
            icon={<X size={14} />}
            label={`清除${chip.label}`}
            tooltip={`清除${chip.label}`}
            size="sm"
            onClick={() => onClear(chip.clearAction)}
          />
        </span>
      ))}
    </div>
  );
}
