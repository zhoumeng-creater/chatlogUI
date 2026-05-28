import { useState } from 'react';
import { Input } from '@l4/ui/Input';
import { AppleButton } from '@l4/ui/AppleButton';

interface QAInputProps {
  onSend: (query: string, scope: 'contact' | 'all') => void;
  disabled: boolean;
  currentContact?: string;
}

export function QAInput({ onSend, disabled, currentContact }: QAInputProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'contact' | 'all'>('contact');

  const handleSend = () => {
    if (!query.trim() || disabled) return;
    onSend(query.trim(), scope);
    setQuery('');
  };

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          placeholder={
            scope === 'contact'
              ? `基于 ${currentContact || '当前联系人'} 提问...`
              : '基于全部聊天记录提问...'
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
        />
        <AppleButton
          variant="primary"
          size="sm"
          onClick={handleSend}
          disabled={disabled || !query.trim()}
          style={{ flexShrink: 0 }}
        >
          发送
        </AppleButton>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={scope === 'contact'}
            onChange={() => setScope('contact')}
            style={{ marginRight: 4 }}
          />
          当前联系人
        </label>
        <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={scope === 'all'}
            onChange={() => setScope('all')}
            style={{ marginRight: 4 }}
          />
          全部联系人
        </label>
      </div>
    </div>
  );
}
