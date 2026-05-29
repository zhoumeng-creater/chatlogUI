import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, SkeletonLoader, Typography } from "@l4/ui";
import { useChatCommander } from "@l2/commander/";
import { ContactItem } from "./ContactItem";

export function ContactList() {
  const {
    conversations,
    conversationsStatus,
    selectedConversationId,
    selectAndLoad,
  } = useChatCommander();

  const [searchText, setSearchText] = useState("");

  const filteredList = useMemo(() => {
    if (!searchText.trim()) return conversations;
    const q = searchText.trim().toLowerCase();
    return conversations.filter(
      (c) => c.displayName.toLowerCase().includes(q) || c.username.toLowerCase().includes(q),
    );
  }, [conversations, searchText]);

  const isLoading = conversationsStatus === "loading";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "8px 12px" }}>
        <Input
          variant="search"
          placeholder="搜索会话"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: "12px" }}>
            <SkeletonLoader variant="rect" height={56} count={8} />
          </div>
        ) : filteredList.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "60%",
            }}
          >
            <Typography variant="body" color="var(--color-text-tertiary)">
              {conversationsStatus === "empty" ? "数据库已连接，但没有会话数据" : "暂无会话"}
            </Typography>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredList.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ContactItem
                  displayName={item.displayName}
                  lastMessage={item.summary}
                  lastTime={item.timeLabel}
                  isGroup={item.isGroup}
                  isSelected={item.id === selectedConversationId}
                  unreadCount={item.unread}
                  onClick={() => selectAndLoad(item.id, item.username)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
