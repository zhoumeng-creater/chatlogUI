import { useState } from 'react';
import { Copy, Download, ListChecks, RotateCcw } from 'lucide-react';
import { Typography } from '@l4/ui/Typography';
import { CodeBlock } from '@l4/ui/CodeBlock';
import { Button } from '@l4/ui/Button';
import { DisabledReason } from '@l4/ui/DisabledReason';
import { classNames } from '@/utils/classNames';
import {
  getSemanticAnswerSegments,
  getSemanticDisplayText,
  getSemanticMetadataChips,
} from './semanticDisplay';

interface QAMessageType {
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

interface QAMessageProps {
  message: QAMessageType;
  privacyOn: boolean;
  onOpenEvidence?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  onCopy?: (messageId: string) => Promise<boolean>;
  onExport?: (messageId: string) => void;
  exportDisabledReason?: string | null;
}

export function QAMessage({
  message,
  privacyOn,
  onOpenEvidence,
  onRetry,
  onCopy,
  onExport,
  exportDisabledReason,
}: QAMessageProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const isUser = message.role === 'user';
  const displayContent = getSemanticDisplayText(message.content, privacyOn);
  const metadataChips = !isUser ? getSemanticMetadataChips({
    ...(message.metadata ?? {}),
    sourceCount: message.sourceCount ?? message.metadata?.sourceCount,
  }) : [];
  const hasEvidence = !isUser && (
    (message.evidence?.length ?? 0) > 0
    || (message.sourceCount ?? 0) > 0
    || metadataChips.some((chip) => chip.startsWith('证据 '))
  );
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
            {!message.isStreaming && message.completionStatus && message.completionStatus !== 'completed' && (
              <div className={classNames("qa-message__completion", `qa-message__completion--${message.completionStatus}`)}>
                {completionLabel(message.completionStatus, message.reason)}
              </div>
            )}
            {metadataChips.length > 0 && (
              <div className="qa-message__chips" aria-label="证据摘要">
                {metadataChips.map((chip) => (
                  <span key={chip} className="qa-message__chip">{chip}</span>
                ))}
              </div>
            )}
            {!message.isStreaming && (
              <div className="qa-message__actions">
                {hasEvidence && onOpenEvidence && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="qa-message__action"
                    onClick={() => onOpenEvidence(message.id)}
                  >
                    <ListChecks size={14} />证据
                  </Button>
                )}
                {!privacyOn && message.content.trim() && onCopy && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="qa-message__action"
                    onClick={async () => {
                      const copied = await onCopy(message.id);
                      setCopyState(copied ? 'copied' : 'failed');
                    }}
                  >
                    <Copy size={14} />{copyState === 'copied' ? '已复制' : '复制'}
                  </Button>
                )}
                {onExport && (
                  exportDisabledReason ? (
                    <DisabledReason reason={exportDisabledReason} variant="compact">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="qa-message__action"
                        disabled
                      >
                        <Download size={14} />导出
                      </Button>
                    </DisabledReason>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="qa-message__action"
                      onClick={() => onExport(message.id)}
                    >
                      <Download size={14} />导出
                    </Button>
                  )
                )}
                {Boolean(message.requestSnapshot) && onRetry && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="qa-message__action"
                    onClick={() => onRetry(message.id)}
                  >
                    <RotateCcw size={14} />重试
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Typography variant="caption" color="var(--color-text-secondary)" className="qa-message__time">
        {timeStr}
      </Typography>
    </div>
  );
}

function completionLabel(status: NonNullable<QAMessageType["completionStatus"]>, reason?: string): string {
  if (status === "stopped") return "已停止，保留当前回答";
  if (status === "failed") return reason || "生成失败";
  if (status === "empty") return reason || "未返回可显示答案";
  return "";
}
