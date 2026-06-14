import { Button, Input, Select, Typography } from "@l4/ui";
import type {
  MediaAvailabilityFilter,
  MediaFilterField,
  MediaFilters,
  MediaSourceFilter,
  MediaTypeFilter,
} from "@l2/data-clerk/stores/useMediaStore";
import type { MediaFilterChip } from "@l2/commander/mediaFilterModel";

interface MediaFilterBarProps {
  filters: MediaFilters;
  activeChips: MediaFilterChip[];
  visibleCount: number;
  totalCount: number;
  selectedCount: number;
  onChange: (filters: MediaFilters) => void;
  onClearFilter: (field: MediaFilterField) => void;
  onReset: () => void;
}

export function MediaFilterBar({
  filters,
  activeChips,
  visibleCount,
  totalCount,
  selectedCount,
  onChange,
  onClearFilter,
  onReset,
}: MediaFilterBarProps) {
  const hasActiveFilters = activeChips.length > 0;

  return (
    <section className="media-filter-bar" aria-label="媒体筛选">
      <div className="media-filter-bar__header">
        <div>
          <Typography variant="label" weight={700}>
            媒体筛选
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            当前可见 {visibleCount.toLocaleString()} / {totalCount.toLocaleString()}
            {selectedCount > 0 ? ` · 已选 ${selectedCount.toLocaleString()}` : ""}
          </Typography>
        </div>
        <Button variant="ghost" size="md" onClick={onReset} disabled={!hasActiveFilters}>
          清除筛选
        </Button>
      </div>

      <div className="media-filter-bar__grid">
        <label className="media-filter-bar__field">
          <span>类型</span>
          <Select
            controlSize="md"
            aria-label="媒体类型"
            value={filters.type}
            onChange={(event) => onChange({ ...filters, type: event.currentTarget.value as MediaTypeFilter })}
          >
            <option value="all">全部媒体</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="voice">语音</option>
            <option value="file">文件</option>
          </Select>
        </label>
        <label className="media-filter-bar__field">
          <span>来源</span>
          <Select
            controlSize="md"
            aria-label="媒体来源"
            value={filters.source}
            onChange={(event) => onChange({ ...filters, source: event.currentTarget.value as MediaSourceFilter })}
          >
            <option value="all">全部来源</option>
            <option value="history">当前会话</option>
            <option value="favorite">收藏</option>
            <option value="new_message">增量消息</option>
          </Select>
        </label>
        <label className="media-filter-bar__field">
          <span>状态</span>
          <Select
            controlSize="md"
            aria-label="媒体状态"
            value={filters.availability}
            onChange={(event) => onChange({
              ...filters,
              availability: event.currentTarget.value as MediaAvailabilityFilter,
            })}
          >
            <option value="all">全部状态</option>
            <option value="available">可预览</option>
            <option value="missing">资源缺失</option>
          </Select>
        </label>
        <label className="media-filter-bar__field">
          <span>开始日期</span>
          <Input
            controlSize="md"
            type="date"
            aria-label="媒体开始日期"
            value={filters.dateRange.start}
            onChange={(event) => onChange({
              ...filters,
              dateRange: { ...filters.dateRange, start: event.currentTarget.value },
            })}
          />
        </label>
        <label className="media-filter-bar__field">
          <span>结束日期</span>
          <Input
            controlSize="md"
            type="date"
            aria-label="媒体结束日期"
            value={filters.dateRange.end}
            onChange={(event) => onChange({
              ...filters,
              dateRange: { ...filters.dateRange, end: event.currentTarget.value },
            })}
          />
        </label>
      </div>

      {hasActiveFilters && (
        <div className="media-filter-bar__chips" aria-label="已启用媒体筛选">
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="media-filter-bar__chip"
              onClick={() => onClearFilter(chip.id)}
              aria-label={`清除${chip.label}筛选`}
            >
              <span>{chip.label}</span>
              <strong>{chip.value}</strong>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
