export const HISTORY_CONTEXT_CONTRACT_VERSION = "history.context.v1" as const;
export const HISTORY_CONTEXT_DEFAULT_LIMIT = 51;
export const HISTORY_CONTEXT_MAX_LIMIT = 101;

export interface HistoryContextRequest {
  conversationId: string;
  seq: number;
  limit?: number;
  dataRevision?: string;
}

export interface HistoryContextMessage {
  seq: number;
  timestamp: number;
  conversationId: string;
  conversationName: string;
  senderId: string;
  senderName: string;
  isSelf: boolean;
  type: number;
  subType: number;
  content: string;
}

export interface HistoryContextPage {
  contractVersion: typeof HISTORY_CONTEXT_CONTRACT_VERSION;
  dataRevision: string;
  exact: true;
  complete: true;
  conversationId: string;
  anchorSeq: number;
  anchorIndex: number;
  limit: number;
  count: number;
  hasBefore: boolean;
  hasAfter: boolean;
  messages: HistoryContextMessage[];
}
