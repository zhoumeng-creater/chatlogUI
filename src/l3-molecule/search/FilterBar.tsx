import { AppleButton } from "@l4/ui";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";

const FILTERS: { key: SearchFilterType; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "text", label: "文本" },
  { key: "image", label: "图片" },
  { key: "video", label: "视频" },
  { key: "file", label: "文件" },
];

interface FilterBarProps {
  activeFilter: SearchFilterType;
  onFilterChange: (filter: SearchFilterType) => void;
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div
      role="toolbar"
      aria-label="搜索结果类型"
      style={{ display: "flex", gap: 8, padding: "8px 0", flexWrap: "wrap" }}
    >
      {FILTERS.map((f) => (
        <AppleButton
          key={f.key}
          type="button"
          aria-pressed={activeFilter === f.key}
          variant={activeFilter === f.key ? "primary" : "ghost"}
          size="sm"
          onClick={() => onFilterChange(f.key)}
        >
          {f.label}
        </AppleButton>
      ))}
    </div>
  );
}
