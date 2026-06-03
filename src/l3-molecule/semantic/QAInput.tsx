import { useState } from 'react';
import { Input } from '@l4/ui/Input';
import { Button } from '@l4/ui/Button';

interface QAInputProps {
  onSend: (query: string, scope: 'contact' | 'all') => void;
  onStop: () => void;
  disabled: boolean;
  currentContact?: string;
}

export function QAInput({ onSend, onStop, disabled, currentContact }: QAInputProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'contact' | 'all'>('contact');

  const handleSend = () => {
    if (!query.trim() || disabled) return;
    onSend(query.trim(), scope);
    setQuery('');
  };

  return (
    <div className="qa-input">
      <div className="qa-input__row">
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
        <Button
          variant="primary"
          size="sm"
          onClick={disabled ? onStop : handleSend}
          disabled={!disabled && !query.trim()}
          className="qa-input__button"
        >
          {disabled ? "停止" : "发送"}
        </Button>
      </div>
      <div className="qa-input__scope">
        <label className="qa-input__option">
          <input
            type="radio"
            checked={scope === 'contact'}
            onChange={() => setScope('contact')}
            className="qa-input__radio"
          />
          当前联系人
        </label>
        <label className="qa-input__option">
          <input
            type="radio"
            checked={scope === 'all'}
            onChange={() => setScope('all')}
            className="qa-input__radio"
          />
          全部联系人
        </label>
      </div>
    </div>
  );
}
