import { useRef, useEffect } from 'react';
import { QAMessage } from './QAMessage';
import { QAInput } from './QAInput';
import { useAiCommander } from '@l2/commander/useAiCommander';
import { useChatCommander } from '@l2/commander/useChatCommander';

export function QAPanel() {
  const { qaMessages, qaStreaming, askQuestion } = useAiCommander();
  const { selectedContact, selectedChatRoom } = useChatCommander();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentContact =
    selectedContact?.remark || selectedContact?.nickName || selectedChatRoom?.nickName || '';

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
