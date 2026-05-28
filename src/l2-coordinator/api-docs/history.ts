export interface HistoryMessage {
  seq: number;
  id: string;
  time: string;
  talker: string;
  sender: string;
  isSelf: boolean;
  type: number;
  subType: number;
  content: string;
  mediaMsg: string;
  mediaType?: string;
  mediaKey?: string;
  mediaKeys?: string[];
  mediaPath?: string;
  mediaUrl?: string;
  imageKey?: string;
  imageKeys?: string[];
  imagePath?: string;
  imageUrl?: string;
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: string;
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
  messages: HistoryMessage[];
}

export interface HistoryQueryParams {
  chat: string;
  limit?: number;
  offset?: number;
}
