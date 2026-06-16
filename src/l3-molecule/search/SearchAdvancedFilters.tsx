import type {
  SearchAdvancedFiltersState,
  SearchGroupMode,
  SearchSortMode,
} from "@l2/commander/searchAdvancedFilters";
import { Input, Select, Typography } from "@l4/ui";

interface SearchAdvancedFiltersProps {
  filters: SearchAdvancedFiltersState;
  onChange: (filters: SearchAdvancedFiltersState) => void;
}

const SORT_LABELS: Record<SearchSortMode, string> = {
  "time-desc": "时间从新到旧",
  "time-asc": "时间从早到晚",
  relevance: "相关性",
};

const GROUP_LABELS: Record<SearchGroupMode, string> = {
  flat: "不分组",
  conversation: "按会话分组",
  date: "按日期分组",
};

export function SearchAdvancedFilters({ filters, onChange }: SearchAdvancedFiltersProps) {
  const update = (partial: Partial<SearchAdvancedFiltersState>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <section className="search-advanced-filters" aria-label="高级筛选">
      <div className="search-advanced-filters__header">
        <Typography variant="label" weight={700}>
          高级筛选
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          日期会进入后端搜索请求；排序和分组只整理已加载结果。
        </Typography>
      </div>
      <div className="search-advanced-filters__grid">
        <label className="search-advanced-filters__field">
          <span>开始日期</span>
          <Input
            type="date"
            value={filters.dateRange?.start ?? ""}
            onChange={(event) => update({
              dateRange: {
                ...(filters.dateRange ?? {}),
                start: event.currentTarget.value || undefined,
              },
            })}
          />
        </label>
        <label className="search-advanced-filters__field">
          <span>结束日期</span>
          <Input
            type="date"
            value={filters.dateRange?.end ?? ""}
            onChange={(event) => update({
              dateRange: {
                ...(filters.dateRange ?? {}),
                end: event.currentTarget.value || undefined,
              },
            })}
          />
        </label>
        <label className="search-advanced-filters__field">
          <span>排序</span>
          <Select
            value={filters.sortMode}
            onChange={(event) => update({ sortMode: event.currentTarget.value as SearchSortMode })}
          >
            <option value="time-desc">{SORT_LABELS["time-desc"]}</option>
            <option value="time-asc">{SORT_LABELS["time-asc"]}</option>
            <option value="relevance" disabled>
              相关性（需要后端支持）
            </option>
          </Select>
        </label>
        <label className="search-advanced-filters__field">
          <span>分组</span>
          <Select
            value={filters.groupMode}
            onChange={(event) => update({ groupMode: event.currentTarget.value as SearchGroupMode })}
          >
            <option value="flat">{GROUP_LABELS.flat}</option>
            <option value="conversation">{GROUP_LABELS.conversation}</option>
            <option value="date">{GROUP_LABELS.date}</option>
          </Select>
        </label>
      </div>
      <div className="search-advanced-filters__unsupported" aria-label="暂不可用筛选">
        <span>发送者筛选需要后端支持</span>
        <span>收藏筛选需要后端支持</span>
        <span>附件筛选需要后端支持</span>
      </div>
    </section>
  );
}
