import { AppleButton } from "@l4/ui";

export type FilterType = "all" | "text" | "image" | "video" | "file";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "text", label: "文本" },
  { key: "image", label: "图片" },
  { key: "video", label: "视频" },
  { key: "file", label: "文件" },
];

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 16px", flexWrap: "wrap" }}>
      {FILTERS.map((f) => (
        <AppleButton
          key={f.key}
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
