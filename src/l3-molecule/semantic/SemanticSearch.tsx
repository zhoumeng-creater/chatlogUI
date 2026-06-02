import { useState } from 'react';
import { Typography } from '@l4/ui/Typography';
import { Input } from '@l4/ui/Input';
import { Spinner } from '@l4/ui/Spinner';
import { Button } from '@l4/ui/Button';
import { getSemanticDisplayText } from './semanticDisplay';

interface SemanticSearchResultItemView {
  chat: string;
  chatName?: string;
  sender: string;
  senderId?: string;
  time: string;
  content: string;
  relevanceScore: number;
  localId: number;
}

interface SemanticSearchResultsView {
  count?: number;
  totalCount?: number;
  results: SemanticSearchResultItemView[];
}

interface SemanticSearchProps {
  searchResults: SemanticSearchResultsView | null;
  searchLoading: boolean;
  searchError?: string | null;
  privacyOn: boolean;
  onSearch: (query: string, scope?: "contact" | "all") => void;
  onSelectResult: (chat: string, label: string) => void;
  onRetry?: () => void;
}

export function SemanticSearch({
  searchResults,
  searchLoading,
  searchError,
  privacyOn,
  onSearch,
  onSelectResult,
  onRetry,
}: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'contact' | 'all'>('contact');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onSearch(v, scope);
  };

  const exampleQueries = [
    '上个月和老板讨论了什么',
    '关于预算的会议记录',
    '谁提到了项目上线时间',
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12 }}>
        <Input
          placeholder="用自然语言搜索聊天记录..."
          value={query}
          onChange={handleChange}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
            <input type="radio" checked={scope === 'contact'} onChange={() => setScope('contact')} style={{ marginRight: 4 }} />
            当前联系人
          </label>
          <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
            <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} style={{ marginRight: 4 }} />
            全部联系人
          </label>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
        {searchLoading && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spinner size={20} />
          </div>
        )}

        {!query && !searchResults && (
          <div style={{ padding: 16 }}>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 8 }}>
              示例查询:
            </Typography>
            {exampleQueries.map((eq, i) => (
              <div
                key={i}
                onClick={() => { setQuery(eq); onSearch(eq, scope); }}
                style={{
                  padding: '8px 12px',
                  marginBottom: 6,
                  borderRadius: 8,
                  background: 'rgba(0,122,255,0.06)',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--accent)',
                }}
              >
                {eq}
              </div>
            ))}
          </div>
        )}

        {searchError && (
          <div style={{ padding: 16, textAlign: "center" }} role="alert">
            <Typography variant="body" color="var(--danger)" style={{ marginBottom: 8 }}>
              {searchError}
            </Typography>
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                重试
              </Button>
            )}
          </div>
        )}

        {query && !searchLoading && !searchError && searchResults && searchResults.results.length === 0 && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <Typography variant="body" color="var(--text-secondary)">
              没有找到语义匹配结果。
            </Typography>
          </div>
        )}

        {searchResults && (
          <div>
            <Typography variant="caption" color="var(--color-text-secondary)" style={{ marginBottom: 8 }}>
              找到 {searchResults.count ?? searchResults.totalCount ?? searchResults.results.length} 条结果
            </Typography>
            {searchResults.results.map((r, i) => (
              (() => {
                const sender = getSemanticDisplayText(r.sender, privacyOn, "未知发送者");
                const chatLabel = getSemanticDisplayText(r.chatName || r.chat, privacyOn, "未知会话");
                const content = getSemanticDisplayText(r.content, privacyOn);
                const score = r.relevanceScore <= 1 ? r.relevanceScore * 100 : r.relevanceScore;
                return (
              <div
                key={i}
                onClick={() => {
                  if (r.chat) onSelectResult(r.chat, r.chatName || r.chat);
                }}
                style={{
                  padding: '8px 10px',
                  marginBottom: 6,
                  borderRadius: 8,
                  cursor: r.chat ? 'pointer' : 'default',
                  opacity: r.chat ? 1 : 0.64,
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Typography variant="caption" weight={600}>
                    {chatLabel} · {sender}
                  </Typography>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {r.time}
                  </Typography>
                </div>
                <Typography variant="caption" color="var(--color-text-secondary)" style={{ marginBottom: 4 }}>
                  {content.length > 100 ? content.slice(0, 100) + '...' : content}
                </Typography>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: 'var(--color-border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(0, Math.min(100, score))}%`,
                        background: 'linear-gradient(90deg, var(--success), var(--accent))',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {Math.round(score)}%
                  </Typography>
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
