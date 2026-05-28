import { motion } from 'framer-motion';
import { Typography } from '@l4/ui/Typography';
import { CodeBlock } from '@l4/ui/CodeBlock';
import type { QAMessage as QAMessageType } from '@/l2-coordinator/api-docs/semantic';

interface QAMessageProps {
  message: QAMessageType;
}

function renderMarkdown(content: string): React.ReactNode[] {
  if (!content) return [];
  const nodes: React.ReactNode[] = [];

  const parts = content.split(/(```[\s\S]*?```)/g);
  let k = 0;

  for (const part of parts) {
    if (part.startsWith('```')) {
      const codeMatch = part.match(/```(\w+)?\n?([\s\S]*?)```/);
      if (codeMatch) {
        nodes.push(
          <CodeBlock
            key={k++}
            code={codeMatch[2].trim()}
            language={codeMatch[1] || undefined}
          />
        );
      }
    } else {
      const lines = part.split('\n');
      for (const line of lines) {
        if (!line.trim()) {
          nodes.push(<div key={k++} style={{ height: 8 }} />);
          continue;
        }
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:13px">$1</code>');
        nodes.push(
          <div
            key={k++}
            style={{ lineHeight: 1.6, wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      }
    }
  }
  return nodes;
}

export function QAMessage({ message }: QAMessageProps) {
  const isUser = message.role === 'user';
  const timeStr = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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
            ? 'var(--color-bubble-self, #007AFF)'
            : 'var(--color-bubble-other, rgba(255,255,255,0.9))',
          color: isUser ? '#fff' : 'var(--color-text-primary)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {isUser ? (
          <Typography variant="body">{message.content}</Typography>
        ) : (
          <div>
            {renderMarkdown(message.content)}
            {message.isStreaming && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
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
    </motion.div>
  );
}
