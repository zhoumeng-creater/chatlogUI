import { Input } from "@l4/ui";
import type { ConversationFilter } from "./conversationDisplay";

const FILTERS: { value: ConversationFilter; label: string }[] = [
  { value: "recent", label: "最近" },
  { value: "private", label: "私聊" },
  { value: "group", label: "群聊" },
];

interface ConversationListToolbarProps {
  query: string;
  filter: ConversationFilter;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: ConversationFilter) => void;
}

export function ConversationListToolbar({
  query,
  filter,
  onQueryChange,
  onFilterChange,
}: ConversationListToolbarProps) {
  return (
    <div className="conversation-list__toolbar">
      <Input
        variant="search"
        aria-label="搜索会话"
        placeholder="搜索会话"
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
      />
      <div className="conversation-list__filters" role="toolbar" aria-label="会话类型">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="conversation-list__filter"
            aria-pressed={filter === item.value}
            onClick={() => onFilterChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
