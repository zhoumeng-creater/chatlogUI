import { Button, DisabledReason } from "@l4/ui";
import type { SearchScope } from "@l2/data-clerk/stores/useSearchStore";

interface SearchScopeMenuProps {
  scope: SearchScope;
  currentConversationName: string;
  currentConversationAvailable: boolean;
  onChange: (scope: SearchScope) => void;
}

export function SearchScopeMenu({
  scope,
  currentConversationName,
  currentConversationAvailable,
  onChange,
}: SearchScopeMenuProps) {
  const currentScopeDisabledReasonId = !currentConversationAvailable
    ? "search-current-scope-disabled-reason"
    : undefined;

  return (
    <div className="search-scope-menu" role="toolbar" aria-label="搜索范围">
      <Button
        variant={scope === "all" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("all")}
      >
        全部
      </Button>
      <Button
        variant={scope === "current" ? "secondary" : "ghost"}
        size="sm"
        disabled={!currentConversationAvailable}
        aria-describedby={currentScopeDisabledReasonId}
        onClick={() => onChange("current")}
      >
        {currentConversationAvailable ? currentConversationName : "当前会话"}
      </Button>
      {!currentConversationAvailable && (
        <DisabledReason
          id={currentScopeDisabledReasonId}
          reason="先选择一个会话。选择会话后可搜索当前会话。"
          variant="compact"
        />
      )}
    </div>
  );
}
