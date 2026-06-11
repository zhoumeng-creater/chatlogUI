import { useRef, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@l4/ui/Button';
import { DisabledReason } from '@l4/ui/DisabledReason';
import { QAMessage } from './QAMessage';
import { QAInput, type QAComposerDraft, type QAEntityOverride, type QARecentChatOption } from './QAInput';
import { SemanticQAEvidenceDrawer } from './SemanticQAEvidenceDrawer';

interface QAMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  completionStatus?: 'streaming' | 'completed' | 'stopped' | 'failed' | 'empty';
  evidence?: Array<Record<string, unknown>>;
  reason?: string;
  sourceCount?: number;
  metadata?: Record<string, unknown>;
  requestSnapshot?: unknown;
}

interface QAPanelProps {
  qaMessages: QAMessageView[];
  qaStreaming: boolean;
  qaStatus: "idle" | "connecting" | "streaming" | "completed" | "stopped" | "failed" | "empty";
  qaError: string | null;
  currentContact: string;
  recentChats?: QARecentChatOption[];
  privacyOn: boolean;
  onAskQuestion: (draft: QAComposerDraft) => void;
  onStopQAStream: () => void;
  onRetryQAMessage: (messageId: string) => void;
  onCopyQAMessageAnswer: (messageId: string) => Promise<boolean>;
  onClearQAMessages: () => void;
  onSelectEvidenceSource?: (chat: string, label: string, localId?: number) => void;
}

export function QAPanel({
  qaMessages,
  qaStreaming,
  qaStatus,
  qaError,
  currentContact,
  recentChats,
  privacyOn,
  onAskQuestion,
  onStopQAStream,
  onRetryQAMessage,
  onCopyQAMessageAnswer,
  onClearQAMessages,
  onSelectEvidenceSource,
}: QAPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [evidenceMessageId, setEvidenceMessageId] = useState<string | null>(null);
  const [entityOverride, setEntityOverride] = useState<QAEntityOverride | null>(null);
  const evidenceMessage = qaMessages.find((message) => message.id === evidenceMessageId);
  const hasMessages = qaMessages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaMessages]);

  const clearButton = (
    <Button
      variant="ghost"
      size="sm"
      className="qa-panel__clear"
      aria-label="清空问答记录"
      disabled={qaStreaming}
      onClick={onClearQAMessages}
    >
      <Trash2 size={14} />
      清空问答
    </Button>
  );

  return (
    <div className="qa-panel">
      {hasMessages && (
        <div className="qa-panel__toolbar">
          {qaStreaming ? (
            <DisabledReason reason="正在生成回答，停止后可清空" variant="compact">
              {clearButton}
            </DisabledReason>
          ) : clearButton}
        </div>
      )}
      <div className="qa-panel__messages">
        {qaMessages.map((msg) => (
          <QAMessage
            key={msg.id}
            message={msg}
            privacyOn={privacyOn}
            onOpenEvidence={setEvidenceMessageId}
            onRetry={onRetryQAMessage}
            onCopy={onCopyQAMessageAnswer}
          />
        ))}
        {qaStatus === "stopped" && (
          <div className="qa-panel__status qa-panel__status--stopped">已停止生成</div>
        )}
        {qaStatus === "empty" && (
          <div className="qa-panel__status qa-panel__status--empty">未返回可显示答案</div>
        )}
        {qaStatus === "failed" && (
          <div className="qa-panel__status qa-panel__status--failed">{qaError || "生成失败"}</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {evidenceMessage && evidenceMessage.role === 'assistant' && (
        <SemanticQAEvidenceDrawer
          message={evidenceMessage}
          privacyOn={privacyOn}
          onClose={() => setEvidenceMessageId(null)}
          onUseEntityCandidate={(candidate) => {
            setEntityOverride({
              value: candidate.entityOverride,
              label: candidate.displayLabel,
            });
          }}
          onOpenSource={onSelectEvidenceSource}
        />
      )}

      <QAInput
        onSend={onAskQuestion}
        onStop={onStopQAStream}
        disabled={qaStreaming}
        privacyOn={privacyOn}
        currentContact={currentContact}
        recentChats={recentChats}
        entityOverride={entityOverride}
        onClearEntityOverride={() => setEntityOverride(null)}
      />
    </div>
  );
}
