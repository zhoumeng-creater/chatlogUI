import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, SkeletonLoader, Typography } from "@l4/ui";
import { useChatCommander } from "@l2/commander/";
import type { Contact, Session, ChatRoom } from "@l2/api-docs/contacts";
import { ContactItem } from "./ContactItem";

interface MergedContact {
  userName: string;
  displayName: string;
  lastMessage: string;
  lastTime: string;
  isGroup: boolean;
  unreadCount: number;
  _raw: Contact | ChatRoom;
}

function mergeContactsAndSessions(contacts: Contact[], sessions: Session[]) {
  const sessionMap = new Map<string, Session>();
  for (const s of sessions) {
    sessionMap.set(s.userName, s);
  }
  return contacts.map((c) => {
    const session = sessionMap.get(c.userName);
    const displayName = c.remark || c.nickName || c.userName;
    const lastTime = session?.nTime
      ? new Date(session.nTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      : "";
    return {
      userName: c.userName,
      displayName,
      lastMessage: session?.content || "",
      lastTime,
      isGroup: c.userName?.includes("@chatroom") || false,
      unreadCount: 0,
      _raw: c as Contact | ChatRoom,
    };
  });
}

function mapChatRooms(chatRooms: ChatRoom[]): MergedContact[] {
  return chatRooms.map((r) => ({
    userName: r.name,
    displayName: r.remark || r.nickName || r.name,
    lastMessage: "",
    lastTime: "",
    isGroup: true,
    unreadCount: 0,
    _raw: r,
  }));
}

export function ContactList() {
  const {
    contacts,
    sessions,
    chatRooms,
    contactsLoading,
    selectedContact,
    selectedChatRoom,
    selectAndLoad,
    loadContacts,
  } = useChatCommander();

  const [searchText, setSearchText] = useState("");

  const mergedList = useMemo<MergedContact[]>(() => {
    const fromContacts = mergeContactsAndSessions(contacts, sessions);
    const fromRooms = mapChatRooms(chatRooms);
    return [...fromContacts, ...fromRooms];
  }, [contacts, sessions, chatRooms]);

  const filteredList = useMemo(() => {
    if (!searchText.trim()) return mergedList;
    const q = searchText.trim().toLowerCase();
    return mergedList.filter((c) => c.displayName.toLowerCase().includes(q));
  }, [mergedList, searchText]);

  const isSelected = useCallback(
    (item: MergedContact) => {
      if (item.isGroup) {
        return selectedChatRoom?.name === item.userName;
      }
      return selectedContact?.userName === item.userName;
    },
    [selectedContact, selectedChatRoom],
  );

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "8px 12px" }}>
        <Input
          variant="search"
          placeholder="搜索联系人"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {contactsLoading ? (
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
              暂无联系人
            </Typography>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredList.map((item, idx) => (
              <motion.div
                key={item.userName}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
              >
                <ContactItem
                  displayName={item.displayName}
                  lastMessage={item.lastMessage}
                  lastTime={item.lastTime}
                  isGroup={item.isGroup}
                  isSelected={isSelected(item)}
                  unreadCount={item.unreadCount}
                  onClick={() => selectAndLoad(item.userName, item.displayName, item.isGroup)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
