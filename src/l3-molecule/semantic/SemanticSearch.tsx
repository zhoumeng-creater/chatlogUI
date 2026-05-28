import { useState } from 'react';
import { Typography } from '@l4/ui/Typography';
import { Input } from '@l4/ui/Input';
import { Spinner } from '@l4/ui/Spinner';
import { useAiCommander } from '@l2/commander/useAiCommander';
import { useChatCommander } from '@l2/commander/useChatCommander';

export function SemanticSearch() {
  const { debouncedSearch, searchResults, searchLoading } = useAiCommander();
  const { selectAndLoad } = useChatCommander();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'contact' | 'all'>('contact');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    debouncedSearch(v, scope);
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
                onClick={() => { setQuery(eq); debouncedSearch(eq, scope); }}
                style={{
                  padding: '8px 12px',
                  marginBottom: 6,
                  borderRadius: 8,
                  background: 'rgba(0,122,255,0.06)',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#007AFF',
                }}
              >
                {eq}
              </div>
            ))}
          </div>
        )}

        {searchResults && (
          <div>
            <Typography variant="caption" color="var(--color-text-secondary)" style={{ marginBottom: 8 }}>
              找到 {searchResults.totalCount} 条结果
            </Typography>
            {searchResults.results.map((r, i) => (
              <div
                key={i}
                onClick={() => selectAndLoad(r.chat, r.sender, false)}
                style={{
                  padding: '8px 10px',
                  marginBottom: 6,
                  borderRadius: 8,
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Typography variant="caption" weight={600}>
                    {r.sender}
                  </Typography>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {r.time}
                  </Typography>
                </div>
                <Typography variant="caption" color="var(--color-text-secondary)" style={{ marginBottom: 4 }}>
                  {r.content.length > 100 ? r.content.slice(0, 100) + '...' : r.content}
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
                        width: `${r.relevanceScore}%`,
                        background: 'linear-gradient(90deg, #34C759, #007AFF)',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {Math.round(r.relevanceScore)}%
                  </Typography>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
