export interface HistoryMessage {
  seq: number;
  id: string;
  localId?: number;
  timestamp?: number;
  time: string;
  talker: string;
  talkerName?: string;
  sender: string;
  senderName?: string;
  isSelf: boolean;
  type: string | number;
  subType: string | number;
  content: string;
  mediaMsg?: string;
  mediaType?: string;
  mediaKey?: string;
  mediaKeys?: string[];
  mediaPath?: string;
  mediaUrl?: string;
  imageKey?: string;
  imageKeys?: string[];
  imagePath?: string;
  imageUrl?: string;
  fileName?: string;
  hour?: number;
  hasMedia?: boolean;
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: string;
  attachments?: Array<{
    id: string;
    kind: string;
    resourceKind: string;
    resourceKey: string;
    label: string;
    directUrl?: string;
    redactedEndpointLabel: string;
    source: string;
  }>;
  direction?: "self" | "other" | "unknown";
}

export interface HistoryResponse {
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: string;
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  querySince?: number;
  queryUntil?: number;
  queryRangeLabel?: string;
  messages: HistoryMessage[];
}

export interface HistoryQueryParams {
  chat: string;
  limit?: number;
  offset?: number;
  time?: string;
  since?: number;
  until?: number;
  msgType?: string;
}
