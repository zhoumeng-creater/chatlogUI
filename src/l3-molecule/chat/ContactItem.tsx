import { motion } from "framer-motion";
import { Avatar, Typography, Badge } from "@l4/ui";

interface ContactItemProps {
  displayName: string;
  lastMessage?: string;
  lastTime?: string;
  isGroup?: boolean;
  isSelected?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function ContactItem({
  displayName,
  lastMessage = "",
  lastTime = "",
  isGroup = false,
  isSelected = false,
  unreadCount = 0,
  onClick,
}: ContactItemProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        cursor: "pointer",
        borderRadius: 12,
        margin: "2px 8px",
        backgroundColor: isSelected ? "rgba(0, 122, 255, 0.12)" : "transparent",
        transition: "background-color 0.15s ease",
      }}
    >
      <Avatar
        alt={displayName}
        size={44}
        fallback={isGroup ? displayName.slice(0, 1) : displayName.slice(0, 2)}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography
            variant="label"
            color="var(--color-text-primary)"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 140,
            }}
          >
            {displayName}
          </Typography>
          <Typography variant="caption" color="var(--color-text-tertiary)">
            {lastTime}
          </Typography>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography
            variant="caption"
            color="var(--color-text-secondary)"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 160,
            }}
          >
            {lastMessage || ""}
          </Typography>
          {unreadCount > 0 && (
            <Badge count={unreadCount} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
