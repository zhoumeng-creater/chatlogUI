import { Typography } from '@l4/ui/Typography';
import { CodeBlock } from '@l4/ui/CodeBlock';
import { classNames } from '@/utils/classNames';
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
    <div className={classNames("qa-message", isUser ? "qa-message--user" : "qa-message--assistant")}>
      <div className="qa-message__bubble">
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
                  <div key={`${segment.type}-${index}`} className="qa-message__bullet">
                    <span aria-hidden="true">-</span>
                    <span>{segment.text}</span>
                  </div>
                );
              }
              return (
                <div key={`${segment.type}-${index}`} className="qa-message__text">
                  {segment.text}
                </div>
              );
            })}
            {message.isStreaming && (
              <span className="qa-message__cursor" />
            )}
          </div>
        )}
      </div>
      <Typography variant="caption" color="var(--color-text-quaternary)" className="qa-message__time">
        {timeStr}
      </Typography>
    </div>
  );
}
