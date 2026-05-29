import { useRef, useEffect } from 'react';
import { QAMessage } from './QAMessage';
import { QAInput } from './QAInput';
import { useAiCommander } from '@l2/commander/useAiCommander';
import { useChatCommander } from '@l2/commander/useChatCommander';
import { useChatStore } from '@l2/data-clerk/stores/useChatStore';

export function QAPanel() {
  const { qaMessages, qaStreaming, askQuestion } = useAiCommander();
  const { selectedConversationId } = useChatCommander();
  const conversations = useChatStore((s) => s.conversations);
  const currentConv = conversations.find(c => c.id === selectedConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentContact = currentConv?.displayName || '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaMessages]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 8 }}>
        {qaMessages.map((msg) => (
          <QAMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <QAInput
        onSend={askQuestion}
        disabled={qaStreaming}
        currentContact={currentContact}
      />
    </div>
  );
}
