import { motion } from "framer-motion";
import { Avatar, Typography, Badge } from "@l4/ui";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";

function maskText(text: string): string {
  return text.replace(/[^\s]/g, "*");
}

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
  const privacyOn = useSettingsStore((s) => s.settings.privacyOn);
  const shownName = privacyOn ? maskText(displayName) : displayName;
  const shownMessage = privacyOn ? maskText(lastMessage) : lastMessage;

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
      <div style={{ filter: privacyOn ? "blur(8px)" : "none", transition: "filter 0.2s ease" }}>
        <Avatar
          alt={displayName}
          size={44}
          fallback={isGroup ? displayName.slice(0, 1) : displayName.slice(0, 2)}
        />
      </div>
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
            {shownName}
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
            {shownMessage || ""}
          </Typography>
          {unreadCount > 0 && (
            <Badge count={unreadCount} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
