import { adaptHistoryMessage, adaptSessionToConversation } from "./chatlogAdapters";
import type {
  RawFavoritesResponse,
  RawMembersResponse,
  RawNewMessagesResponse,
  RawUnreadResponse,
} from "./chatlogRawTypes";

export interface AdaptedUnreadResponse {
  total: number;
  sessions: ReturnType<typeof adaptSessionToConversation>[];
}

export interface AdaptedMember {
  id: string;
  username: string;
  display: string;
  isOwner: boolean;
}

export interface AdaptedMembersResponse {
  chat: string;
  username: string;
  count: number;
  members: AdaptedMember[];
}

export interface AdaptedNewMessagesResponse {
  count: number;
  messages: ReturnType<typeof adaptHistoryMessage>[];
  newState: Record<string, number>;
}

export interface AdaptedFavoriteItem {
  id: string;
  type: string;
  typeNum: number;
  kindLabel: string;
  time: string;
  timestamp: number;
  preview: string;
  from: string;
  chat: string;
}

export interface AdaptedFavoritesResponse {
  count: number;
  items: AdaptedFavoriteItem[];
}

const FAVORITE_KIND_LABELS: Record<string, string> = {
  text: "文本",
  image: "图片",
  video: "视频",
  voice: "语音",
  file: "文件",
  link: "链接",
};

export function adaptUnreadResponse(raw: RawUnreadResponse): AdaptedUnreadResponse {
  return {
    total: raw.total ?? raw.sessions?.length ?? 0,
    sessions: (raw.sessions ?? []).map((session) => ({
      ...adaptSessionToConversation(session),
      unread: session.unread ?? 0,
      lastSender: session.last_sender ?? "",
      summary: session.summary ?? "",
    })),
  };
}

export function adaptMembersResponse(raw: RawMembersResponse): AdaptedMembersResponse {
  return {
    chat: raw.chat,
    username: raw.username,
    count: raw.count ?? raw.members?.length ?? 0,
    members: (raw.members ?? []).map((member) => ({
      id: member.username,
      username: member.username,
      display: member.display || member.username,
      isOwner: member.is_owner === true,
    })),
  };
}

export function adaptNewMessagesResponse(
  raw: RawNewMessagesResponse,
): AdaptedNewMessagesResponse {
  return {
    count: raw.count ?? raw.messages?.length ?? 0,
    messages: (raw.messages ?? []).map((message) => adaptHistoryMessage(message)),
    newState: raw.new_state ?? {},
  };
}

export function adaptFavoritesResponse(raw: RawFavoritesResponse): AdaptedFavoritesResponse {
  return {
    count: raw.count ?? raw.items?.length ?? 0,
    items: (raw.items ?? []).map((item) => ({
      id: item.id,
      type: item.type,
      typeNum: item.type_num ?? 0,
      kindLabel: FAVORITE_KIND_LABELS[item.type] ?? (item.type || "收藏"),
      time: item.time ?? "",
      timestamp: item.timestamp ?? 0,
      preview: item.preview ?? "",
      from: item.from ?? "",
      chat: item.chat ?? "",
    })),
  };
}
