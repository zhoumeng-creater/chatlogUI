import { Input, Spinner, Typography } from "@l4/ui";
import { useSearchCommander } from "@l2/commander/";

interface GlobalSearchProps {
  className?: string;
  style?: React.CSSProperties;
}

export function GlobalSearch({ className, style }: GlobalSearchProps) {
  const { query, results, loading, search, executeSearch, clearSearch } = useSearchCommander();

  const resultCount = results?.totalCount ?? 0;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeSearch(e.currentTarget.value);
    }
    if (e.key === "Escape") {
      clearSearch();
    }
  };

  return (
    <div
      className={className}
      style={{
        ...style,
        position: "relative",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Input
          variant="search"
          aria-label="搜索聊天记录"
          placeholder="搜索聊天记录"
          value={query}
          onChange={(e) => search((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
        />
        {loading && (
          <div style={{ position: "absolute", right: 10 }}>
            <Spinner size={16} color="var(--color-text-tertiary)" />
          </div>
        )}
      </div>

      {resultCount > 0 && (
        <div style={{ marginTop: 6, paddingLeft: 6 }}>
          <Typography variant="caption" color="var(--color-text-tertiary)">
            找到 {resultCount} 条匹配记录
          </Typography>
        </div>
      )}
    </div>
  );
}
