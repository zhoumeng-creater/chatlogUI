import { Typography } from '@l4/ui/Typography';
import { CodeBlock } from '@l4/ui/CodeBlock';
import { getSemanticAnswerSegments, getSemanticDisplayText } from './semanticDisplay';

interface QAMessageType {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface QAMessageProps {
  message: QAMessageType;
  privacyOn: boolean;
}

export function QAMessage({ message, privacyOn }: QAMessageProps) {
  const isUser = message.role === 'user';
  const displayContent = getSemanticDisplayText(message.content, privacyOn);
  const timeStr = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        padding: '6px 12px',
      }}
    >
      <div
        style={{
          maxWidth: '90%',
          padding: '10px 14px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser
            ? 'var(--color-bubble-self, var(--accent))'
            : 'var(--color-bubble-other, rgba(255,255,255,0.9))',
          color: isUser ? '#fff' : 'var(--color-text-primary)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {isUser ? (
          <Typography variant="body">{displayContent}</Typography>
        ) : (
          <div>
            {getSemanticAnswerSegments(displayContent).map((segment, index) => {
              if (segment.type === "code") {
                return (
                  <CodeBlock
                    key={`${segment.type}-${index}`}
                    code={segment.text}
                    language={segment.language}
                  />
                );
              }
              if (segment.type === "heading") {
                return (
                  <Typography key={`${segment.type}-${index}`} variant="label" weight={700}>
                    {segment.text}
                  </Typography>
                );
              }
              if (segment.type === "bullet") {
                return (
                  <div key={`${segment.type}-${index}`} style={{ display: "flex", gap: 6, lineHeight: 1.6 }}>
                    <span aria-hidden="true">-</span>
                    <span>{segment.text}</span>
                  </div>
                );
              }
              return (
                <div key={`${segment.type}-${index}`} style={{ lineHeight: 1.6, wordBreak: 'break-word' }}>
                  {segment.text}
                </div>
              );
            })}
            {message.isStreaming && (
              <span
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: 16,
                  background: 'var(--color-text-primary)',
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                }}
              />
            )}
          </div>
        )}
      </div>
      <Typography variant="caption" color="var(--color-text-quaternary)" style={{ marginTop: 2, padding: '0 4px' }}>
        {timeStr}
      </Typography>
    </div>
  );
}
