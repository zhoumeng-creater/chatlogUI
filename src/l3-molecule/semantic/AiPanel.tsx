import { useRef, useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Typography } from '@l4/ui/Typography';
import { Button } from '@l4/ui/Button';
import { IconButton } from '@l4/ui/IconButton';
import { ProgressBar } from '@l4/ui/ProgressBar';
import { Spinner } from '@l4/ui/Spinner';
import { QAPanel } from './QAPanel';
import { SemanticSearch } from './SemanticSearch';
import { TopicView } from './TopicView';
import { ContactProfile } from './ContactProfile';
import { SetupWizard } from './SetupWizard';
import { useChatCommander } from '@l2/commander/useChatCommander';
import { useChatStore } from '@l2/data-clerk/stores/useChatStore';
import { useAiCommander } from '@l2/commander/useAiCommander';
import { useSettingsStore } from '@l2/data-clerk/stores/useSettingsStore';

type PanelMode = 'stats' | 'ai';
type AiTab = 'qa' | 'search' | 'analysis';

interface AiPanelProps {
  mode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
}

export function AiPanel({ mode, onModeChange }: AiPanelProps) {
  const [activeTab, setActiveTab] = useState<AiTab>('qa');
  const [showWizard, setShowWizard] = useState(false);
  const ai = useAiCommander();
  const aiRef = useRef(ai);
  const analysisRequestKey = useRef<string | null>(null);
  const { selectedConversationId, selectAndLoad } = useChatCommander();
  const conversations = useChatStore((s) => s.conversations);
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const currentConv = conversations.find(c => c.id === selectedConversationId);
  const currentChat = currentConv?.username;
  const currentContact = currentConv?.displayName || '';

  useEffect(() => {
    aiRef.current = ai;
  }, [ai]);

  useEffect(() => {
    if (mode === 'ai') {
      aiRef.current.initialize();
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'ai' || activeTab !== 'analysis' || !currentChat) return;
    const key = `${currentChat}:${ai.indexStatus?.status ?? "unknown"}:${ai.indexStatus?.completed ?? 0}`;
    if (analysisRequestKey.current === key) return;
    analysisRequestKey.current = key;
    aiRef.current.loadAnalysis();
  }, [activeTab, ai.indexStatus?.completed, ai.indexStatus?.status, currentChat, mode]);

  const tabs: { key: AiTab; label: string }[] = [
    { key: 'qa', label: '问答' },
    { key: 'search', label: '搜索' },
    { key: 'analysis', label: '分析' },
  ];

  const indexProgress =
    ai.indexStatus && ai.indexStatus.total > 0
      ? (ai.indexStatus.completed / ai.indexStatus.total) * 100
      : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          padding: '8px 12px',
          borderBottom: '1px solid var(--color-border)',
          gap: 4,
        }}
      >
        <Button
          variant={mode === 'stats' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('stats')}
        >
          统计
        </Button>
        <Button
          variant={mode === 'ai' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('ai')}
        >
          AI
        </Button>
        {mode === 'ai' && ai.moduleView.kind !== 'setup_required' && (
          <div style={{ flex: 1 }} />
        )}
        {mode === 'ai' && ai.moduleView.kind !== 'setup_required' && (
          <IconButton
            label="AI 设置"
            tooltip="AI 设置"
            icon={<Settings size={15} />}
            onClick={() => setShowWizard(true)}
          />
        )}
      </div>

      {mode === 'ai' && ai.moduleView.kind === 'ready' && (
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={[
                "semantic-tab",
                activeTab === tab.key ? "semantic-tab--active" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
          {mode === 'ai' && (
            <div style={{ height: '100%' }}>
              {ai.moduleView.kind === 'checking_config' && (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Spinner size={24} label="正在检查 AI 配置..." />
                </div>
              )}

              {ai.moduleView.kind === 'setup_required' && (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography variant="h3" style={{ marginBottom: 8 }}>
                    AI 功能尚未配置
                  </Typography>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 20 }}>
                    配置 AI 服务后即可体验智能问答、语义搜索和联系人分析
                  </Typography>
                  <Button variant="primary" onClick={() => setShowWizard(true)}>
                    开始配置
                  </Button>
                </div>
              )}

              {ai.moduleView.kind === 'index_unavailable' && !currentChat && (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 12 }}>
                    选择左侧联系人后即可使用 AI 功能
                  </Typography>
                </div>
              )}

              {ai.moduleView.kind === 'index_unavailable' && currentChat && (
                <div style={{ padding: 24 }}>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 12 }}>
                    {ai.moduleView.message}
                  </Typography>
                  <Button variant="primary" size="sm" onClick={() => ai.doIndexAction('rebuild')}>
                    构建索引
                  </Button>
                </div>
              )}

              {ai.moduleView.kind === 'index_running' && (
                <div style={{ padding: 24 }}>
                  <ProgressBar
                    progress={indexProgress}
                    label="正在构建语义索引..."
                    variant={indexProgress === 0 ? 'indeterminate' : 'default'}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Button variant="secondary" size="sm" onClick={() => ai.doIndexAction('pause')}>
                      暂停
                    </Button>
                  </div>
                </div>
              )}

              {ai.moduleView.kind === 'index_paused' && (
                <div style={{ padding: 24 }}>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 12 }}>
                    {ai.moduleView.message}
                  </Typography>
                  <Button variant="primary" size="sm" onClick={() => ai.doIndexAction('resume')}>
                    恢复索引
                  </Button>
                </div>
              )}

              {ai.moduleView.kind === 'ready' && (
                <>
                  {activeTab === 'qa' && !!currentChat && (
                    <QAPanel
                      qaMessages={ai.qaMessages}
                      qaStreaming={ai.qaStreaming}
                      qaStatus={ai.qaStatus}
                      qaError={ai.qaError}
                      currentContact={currentContact}
                      privacyOn={privacyOn}
                      onAskQuestion={ai.askQuestion}
                      onStopQAStream={ai.stopQAStream}
                    />
                  )}
                  {activeTab === 'qa' && !currentChat && (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <Typography variant="body" color="var(--color-text-secondary)">
                        选择左侧联系人后即可开始 AI 问答
                      </Typography>
                    </div>
                  )}
                  {activeTab === 'search' && (
                    <SemanticSearch
                      searchResults={ai.searchResults}
                      searchLoading={ai.searchLoading}
                      searchError={ai.searchError}
                      privacyOn={privacyOn}
                      onSearch={ai.debouncedSearch}
                      onRetry={() => ai.semanticSearch(ai.searchQuery)}
                      onSelectResult={(chat, label) => selectAndLoad(chat, label)}
                    />
                  )}
                  {activeTab === 'analysis' && !!currentChat && (
                    <div style={{ padding: 12 }}>
                      <TopicView
                        topics={ai.topics}
                        loading={ai.topicsLoading}
                        error={ai.topicsError}
                        privacyOn={privacyOn}
                        onRetry={ai.loadAnalysis}
                      />
                      <ContactProfile
                        profile={ai.profile}
                        loading={ai.profileLoading}
                        error={ai.profileError}
                        privacyOn={privacyOn}
                        onRetry={ai.loadAnalysis}
                      />
                    </div>
                  )}
                  {activeTab === 'analysis' && !currentChat && (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <Typography variant="body" color="var(--color-text-secondary)">
                        选择左侧联系人后即可查看分析
                      </Typography>
                    </div>
                  )}
                </>
              )}

              {ai.moduleView.kind === 'failed' && (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography variant="body" color="var(--danger)" style={{ marginBottom: 12 }}>
                    {ai.moduleView.message || ai.error || '发生未知错误'}
                  </Typography>
                  <Button variant="secondary" size="sm" onClick={() => { ai.clearError(); ai.initialize(); }}>
                    重试
                  </Button>
                </div>
              )}

              {ai.moduleView.kind === 'ready' && activeTab === 'analysis' && (
                <div style={{ padding: '4px 12px', borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    索引已就绪 · {ai.indexStatus?.completed?.toLocaleString() || 0} 条已索引
                  </Typography>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <Button variant="ghost" size="sm" onClick={() => ai.doIndexAction('rebuild')}>
                      重建索引
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => ai.doIndexAction('clear')}>
                      清空索引
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {showWizard && (
        <SetupWizard
          onClose={() => setShowWizard(false)}
          testConnection={ai.testConnection}
          saveConfig={ai.saveConfig}
          doIndexAction={ai.doIndexAction}
          indexStatus={ai.indexStatus}
        />
      )}
    </div>
  );
}
