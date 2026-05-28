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
    <div style={{ display: "flex", flexDirection: "column" }}>
      {messages.map((msg, idx) => {
        const timeStr = msg.time
          ? new Date(msg.time).toLocaleString("zh-CN")
          : "";

        return (
          <div
            key={msg.seq || msg.id || idx}
            onClick={() => handleClick(msg)}
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-border, rgba(0,0,0,0.06))",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
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
          </div>
        );
      })}

      {hasMore && (
        <div
          onClick={() => loadMoreResults()}
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "14px 0",
            cursor: "pointer",
          }}
        >
          <Typography variant="label" color="var(--color-text-tertiary)">
            {loading ? "加载中..." : "加载更多..."}
          </Typography>
        </div>
      )}
    </div>
  );
}
