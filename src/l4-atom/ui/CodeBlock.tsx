import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        margin: '8px 0',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--color-code-bg, #1e1e2e)',
        border: '1px solid var(--color-border)',
      }}
    >
      {language && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 12px',
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <span>{language}</span>
          <button
            onClick={handleCopy}
            style={{
              background: 'transparent',
              border: 'none',
              color: copied ? '#34C759' : 'var(--color-text-tertiary)',
              fontSize: 12,
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: '12px',
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 1.5,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          color: 'var(--color-text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
