import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { Button, IconButton, Input, Typography } from "@l4/ui";

interface ConversationInlineSearchProps {
  open: boolean;
  query: string;
  statusText: string;
  matchCount: number;
  activeIndex: number;
  onQueryChange: (query: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onOpenFullSearch: () => void;
}

export function ConversationInlineSearch({
  open,
  query,
  statusText,
  matchCount,
  activeIndex,
  onQueryChange,
  onPrevious,
  onNext,
  onClose,
  onOpenFullSearch,
}: ConversationInlineSearchProps) {
  if (!open) return null;
  const hasMatches = matchCount > 0 && activeIndex >= 0;

  return (
    <section className="conversation-inline-search" role="search" aria-label="搜索当前会话已加载消息">
      <Search size={16} aria-hidden="true" />
      <Input
        variant="search"
        controlSize="sm"
        value={query}
        aria-label="输入关键词搜索当前会话"
        placeholder="搜索已加载消息"
        autoFocus
        onChange={(event) => onQueryChange(event.currentTarget.value)}
      />
      <Typography className="conversation-inline-search__status" variant="caption" color="var(--text-secondary)">
        {statusText}
      </Typography>
      <div className="conversation-inline-search__actions" role="toolbar" aria-label="搜索命中操作">
        <IconButton
          icon={<ArrowUp size={15} />}
          label="上一条命中"
          tooltip="上一条命中"
          size="md"
          disabled={!hasMatches}
          onClick={onPrevious}
        />
        <IconButton
          icon={<ArrowDown size={15} />}
          label="下一条命中"
          tooltip="下一条命中"
          size="md"
          disabled={!hasMatches}
          onClick={onNext}
        />
        <Button variant="ghost" size="sm" onClick={onOpenFullSearch}>
          高级搜索
        </Button>
        <IconButton
          icon={<X size={15} />}
          label="关闭会话内搜索"
          tooltip="关闭会话内搜索"
          size="md"
          onClick={onClose}
        />
      </div>
    </section>
  );
}
