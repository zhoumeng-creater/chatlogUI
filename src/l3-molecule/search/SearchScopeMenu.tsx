import { Button } from "@l4/ui";
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
        onClick={() => onChange("current")}
      >
        {currentConversationAvailable ? currentConversationName : "当前会话"}
      </Button>
    </div>
  );
}
