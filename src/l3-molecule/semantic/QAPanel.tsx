import { useRef, useEffect } from 'react';
import { QAMessage } from './QAMessage';
import { QAInput } from './QAInput';

interface QAMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface QAPanelProps {
  qaMessages: QAMessageView[];
  qaStreaming: boolean;
  qaStatus: "idle" | "connecting" | "streaming" | "completed" | "stopped" | "failed" | "empty";
  qaError: string | null;
  currentContact: string;
  privacyOn: boolean;
  onAskQuestion: (query: string, scope?: "contact" | "all") => void;
  onStopQAStream: () => void;
}

export function QAPanel({
  qaMessages,
  qaStreaming,
  qaStatus,
  qaError,
  currentContact,
  privacyOn,
  onAskQuestion,
  onStopQAStream,
}: QAPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaMessages]);

  return (
    <div className="qa-panel">
      <div className="qa-panel__messages">
        {qaMessages.map((msg) => (
          <QAMessage key={msg.id} message={msg} privacyOn={privacyOn} />
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

      <QAInput
        onSend={onAskQuestion}
        onStop={onStopQAStream}
        disabled={qaStreaming}
        currentContact={currentContact}
      />
    </div>
  );
}
