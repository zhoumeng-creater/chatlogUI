import { X } from "lucide-react";
import { IconButton, Input, Typography } from "@l4/ui";
import type {
  ConversationFilterOptionView,
  ConversationListFilter,
  ConversationListSortState,
} from "@l2/commander/conversationListInteractionModel";

interface ConversationListToolbarProps {
  query: string;
  filter: ConversationListFilter;
  filterOptions: ConversationFilterOptionView[];
  sortState: ConversationListSortState;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: ConversationListFilter) => void;
  onClearQuery: () => void;
}

export function ConversationListToolbar({
  query,
  filter,
  filterOptions,
  sortState,
  onQueryChange,
  onFilterChange,
  onClearQuery,
}: ConversationListToolbarProps) {
  return (
    <div className="conversation-list__toolbar">
      <label className="conversation-list__search-field">
        <span className="conversation-list__search-label">搜索会话</span>
        <span className="conversation-list__search-shell">
          <Input
            variant="search"
            aria-label="搜索会话"
            placeholder="输入联系人、群名或摘要"
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
          />
          {query.trim() && (
            <IconButton
              className="conversation-list__search-clear"
              icon={<X size={14} />}
              label="清除会话搜索"
              tooltip="清除搜索"
              size="sm"
              onClick={onClearQuery}
            />
          )}
        </span>
      </label>
      <Typography variant="caption" color="var(--text-secondary)">
        {sortState.disabledReason ?? sortState.label}
      </Typography>
      <div className="conversation-list__filters" role="toolbar" aria-label="会话类型">
        {filterOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            className="conversation-list__filter"
            aria-pressed={filter === item.value}
            onClick={() => onFilterChange(item.value)}
          >
            <span className="conversation-list__filter-dot" data-tone={item.dotTone} aria-hidden="true" />
            <span>{item.label}</span>
            <span aria-label={`${item.label} ${item.count} 个会话`}>
              {item.count.toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
