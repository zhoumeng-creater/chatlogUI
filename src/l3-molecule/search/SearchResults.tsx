import { Typography } from "@l4/ui";
import { useSearchCommander } from "@l2/commander/";
import { useChatCommander } from "@l2/commander/";

export function SearchResults() {
  const { results, loading, loadMoreResults } = useSearchCommander();
  const { selectAndLoad } = useChatCommander();

  if (!results) return null;

  const messages = results.messages || [];
  const hasMore = results.offset + results.count < results.totalCount;

  const handleClick = (msg: (typeof messages)[0]) => {
    selectAndLoad(msg.chat, msg.sender || msg.chat, msg.isGroup || false);
  };

  return (
    <div
      role="list"
      aria-label="搜索结果"
      style={{
        display: "flex",
        flexDirection: "column",
        maxHeight: 220,
        overflowY: "auto",
        minHeight: 0,
      }}
    >
      {messages.map((msg, idx) => {
        const timeStr = msg.time
          ? new Date(msg.time).toLocaleString("zh-CN")
          : "";

        return (
          <div
            key={msg.seq || msg.id || idx}
            role="listitem"
            style={{
              borderBottom: "1px solid var(--color-border, rgba(0,0,0,0.06))",
            }}
          >
            <button
              type="button"
              aria-label={`打开 ${msg.sender || msg.chat} 的搜索结果`}
              onClick={() => handleClick(msg)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "none",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 12 }}>
                <Typography variant="label" color="var(--color-text-primary)">
                  {msg.sender}
                </Typography>
                <Typography variant="caption" color="var(--color-text-quaternary)">
                  {timeStr}
                </Typography>
              </div>
              <Typography
                variant="body"
                color="var(--color-text-secondary)"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {msg.content}
              </Typography>
            </button>
          </div>
        );
      })}

      {hasMore && (
        <div role="listitem">
          <button
            type="button"
            onClick={() => loadMoreResults()}
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              padding: "14px 0",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <Typography variant="label" color="var(--color-text-tertiary)">
              {loading ? "加载中..." : "加载更多..."}
            </Typography>
          </button>
        </div>
      )}
    </div>
  );
}
