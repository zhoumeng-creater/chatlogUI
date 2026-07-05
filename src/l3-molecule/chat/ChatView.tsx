import type {
  ChatMessage,
  ChatMessageAnchor,
  ChatAnchorStatus,
  Conversation,
  LoadStatus,
  TranscriptScrollIntent,
} from "@l2/data-clerk/stores/useChatStore";
import type { MessageActionId } from "@l2/commander/messageActionModel";
import type { ActionableEmptyStateView, EmptyStateActionId } from "@l2/commander/actionableEmptyStateModel";
import type { MessageActionModel, SafeRawFieldRow } from "@l2/commander/messageActionModel";
import type {
  TranscriptPositionModel,
  TranscriptPositionRow,
} from "@l2/commander/transcriptPositionModel";
import type { ApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";
import type { ChatReadingState } from "@/l2-coordinator/commander/chatReadingState";
import { MessageList } from "./MessageList";
import { MessageSelectionToolbar } from "./MessageSelectionToolbar";
import { TranscriptHeader } from "./TranscriptHeader";

interface ChatViewProps {
  conversation: Conversation | undefined;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesHasMore: boolean;
  messagesStatus: LoadStatus;
  messagesError: string | ApiErrorModel | null;
  readingState: ChatReadingState;
  emptyStates: {
    noConversation: ActionableEmptyStateView;
    conversationEmpty: ActionableEmptyStateView;
  };
  messagesTotalCount: number;
  scrollIntent: TranscriptScrollIntent;
  scrollAnchorMessageId: string | null;
  scrollAnchorLocalId: number | null;
  activeAnchor: ChatMessageAnchor | null;
  anchorStatus: ChatAnchorStatus;
  highlightedMessageId: string | null;
  selectionMode: boolean;
  selectedMessageIds: string[];
  selectionSummary: string;
  selectionStatus: string | null;
  privacyOn: boolean;
  onLoadHistory: (chat: string) => void;
  onLoadMoreHistory: (chat: string) => void;
  onEmptyAction?: (actionId: EmptyStateActionId) => void;
  onScrollIntentHandled: () => void;
  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;
  onToggleMessageSelection: (messageId: string, range?: boolean) => void;
  onSelectVisibleMessages: (messageIds: string[]) => void;
  onCopySelectedMarkdown: () => void;
  onExportSelected: () => void;
  onMessageAction: (message: ChatMessage, actionId: MessageActionId) => void;
  onDeriveTranscriptPosition: (input: {
    rows: TranscriptPositionRow[];
    visibleIndexes: number[];
    messagesHasMore: boolean;
    nearLatest: boolean;
    activeAnchor: ChatMessageAnchor | null;
    anchorStatus: ChatAnchorStatus;
  }) => TranscriptPositionModel;
  getMessageActionModel: (message: ChatMessage) => MessageActionModel;
  getMessageSafeRawFieldRows: (message: ChatMessage) => SafeRawFieldRow[];
}

export function ChatView({
  conversation,
  messages,
  messagesLoading,
  messagesHasMore,
  messagesStatus,
  messagesError,
  readingState,
  emptyStates,
  messagesTotalCount,
  scrollIntent,
  scrollAnchorMessageId,
  scrollAnchorLocalId,
  activeAnchor,
  anchorStatus,
  highlightedMessageId,
  selectionMode,
  selectedMessageIds,
  selectionSummary,
  selectionStatus,
  privacyOn,
  onLoadHistory,
  onLoadMoreHistory,
  onEmptyAction,
  onScrollIntentHandled,
  onEnterSelectionMode,
  onExitSelectionMode,
  onToggleMessageSelection,
  onSelectVisibleMessages,
  onCopySelectedMarkdown,
  onExportSelected,
  onMessageAction,
  onDeriveTranscriptPosition,
  getMessageActionModel,
  getMessageSafeRawFieldRows,
}: ChatViewProps) {
  return (
    <div className="transcript">
      {conversation && (
        <TranscriptHeader
          conversation={conversation}
          totalCount={messagesTotalCount}
          privacyOn={privacyOn}
        />
      )}
      <MessageList
        conversation={conversation}
        messages={messages}
        messagesLoading={messagesLoading}
        messagesHasMore={messagesHasMore}
        messagesStatus={messagesStatus}
        messagesError={messagesError}
        readingState={readingState}
        emptyStates={emptyStates}
        scrollIntent={scrollIntent}
        scrollAnchorMessageId={scrollAnchorMessageId}
        scrollAnchorLocalId={scrollAnchorLocalId}
        activeAnchor={activeAnchor}
        anchorStatus={anchorStatus}
        highlightedMessageId={highlightedMessageId}
        selectionMode={selectionMode}
        selectedMessageIds={selectedMessageIds}
        selectionStatus={selectionStatus}
        privacyOn={privacyOn}
        onLoadHistory={onLoadHistory}
        onLoadMoreHistory={onLoadMoreHistory}
        onEmptyAction={onEmptyAction}
        onScrollIntentHandled={onScrollIntentHandled}
        onEnterSelectionMode={onEnterSelectionMode}
        onExitSelectionMode={onExitSelectionMode}
        onToggleMessageSelection={onToggleMessageSelection}
        onSelectVisibleMessages={onSelectVisibleMessages}
        onMessageAction={onMessageAction}
        onDeriveTranscriptPosition={onDeriveTranscriptPosition}
        getMessageActionModel={getMessageActionModel}
        getMessageSafeRawFieldRows={getMessageSafeRawFieldRows}
      />
      {conversation && selectionMode && (
        <div className="transcript__selection">
          <MessageSelectionToolbar
            selectedCount={selectedMessageIds.length}
            privacyOn={privacyOn}
            summary={selectionSummary}
            exportDisabledReason={selectedMessageIds.length === 0 ? "先选择要导出的消息。" : null}
            onSelectVisibleMessages={() => onSelectVisibleMessages(messages.map((message) => message.id))}
            onCopyMarkdown={onCopySelectedMarkdown}
            onExportSelected={onExportSelected}
            onCancel={onExitSelectionMode}
          />
        </div>
      )}
    </div>
  );
}
