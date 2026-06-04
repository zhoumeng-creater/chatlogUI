import { useRef, useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { classNames } from '@/utils/classNames';
import { Typography } from '@l4/ui/Typography';
import { Button } from '@l4/ui/Button';
import { IconButton } from '@l4/ui/IconButton';
import { ProgressBar } from '@l4/ui/ProgressBar';
import { Spinner } from '@l4/ui/Spinner';
import { QAPanel } from './QAPanel';
import { SemanticSearch } from './SemanticSearch';
import { TopicView } from './TopicView';
import { ContactProfile } from './ContactProfile';
import { SemanticIndexPreview } from './SemanticIndexPreview';
import { SemanticDiscoveryContextBar } from './SemanticDiscoveryContextBar';
import { SetupWizard } from './SetupWizard';
import type { useAiCommander } from '@l2/commander/useAiCommander';

type PanelMode = 'stats' | 'ai';
type AiTab = 'qa' | 'search' | 'analysis' | 'preview';
type AiCommander = ReturnType<typeof useAiCommander>;

interface AiPanelProps {
  mode: PanelMode;
  ai: AiCommander;
  currentChat: string;
  currentContact: string;
  privacyOn: boolean;
  onSelectAndLoad: (conversationId: string, chat: string) => void;
  onModeChange: (mode: PanelMode) => void;
}

export function AiPanel({
  mode,
  ai,
  currentChat,
  currentContact,
  privacyOn,
  onSelectAndLoad,
  onModeChange,
}: AiPanelProps) {
  const [activeTab, setActiveTab] = useState<AiTab>('qa');
  const [showWizard, setShowWizard] = useState(false);
  const aiRef = useRef(ai);
  const analysisRequestKey = useRef<string | null>(null);

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
    const key = `${currentChat}:${ai.discoveryWindow}:${ai.indexStatus?.status ?? "unknown"}:${ai.indexStatus?.completed ?? 0}`;
    if (analysisRequestKey.current === key) return;
    analysisRequestKey.current = key;
    aiRef.current.loadAnalysis();
  }, [activeTab, ai.discoveryWindow, ai.indexStatus?.completed, ai.indexStatus?.status, currentChat, mode]);

  useEffect(() => {
    if (mode !== 'ai' || activeTab !== 'preview') return;
    aiRef.current.loadPreview();
  }, [activeTab, mode]);

  const tabs: { key: AiTab; label: string }[] = [
    { key: 'qa', label: '问答' },
    { key: 'search', label: '搜索' },
    { key: 'analysis', label: '分析' },
    { key: 'preview', label: '预览' },
  ];

  const indexProgress =
    ai.indexStatus && ai.indexStatus.total > 0
      ? (ai.indexStatus.completed / ai.indexStatus.total) * 100
      : 0;

  return (
    <div className="semantic-panel">
      <div className="semantic-panel__modebar">
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
          <div className="semantic-panel__spacer" />
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
        <div className="semantic-panel__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={classNames(
                "semantic-tab",
                activeTab === tab.key && "semantic-tab--active",
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="semantic-panel__body">
          {mode === 'ai' && (
            <div className="semantic-panel__content">
              {ai.moduleView.kind === 'checking_config' && (
                <div className="semantic-state semantic-state--loose">
                  <Spinner size={24} label="正在检查 AI 配置..." />
                </div>
              )}

              {ai.moduleView.kind === 'setup_required' && (
                <div className="semantic-state">
                  <Typography variant="h3" className="semantic-state__title">
                    AI 功能尚未配置
                  </Typography>
                  <Typography variant="body" color="var(--color-text-secondary)" className="semantic-state__copy">
                    配置 AI 服务后即可体验智能问答、语义搜索和联系人分析
                  </Typography>
                  <Button variant="primary" onClick={() => setShowWizard(true)}>
                    开始配置
                  </Button>
                </div>
              )}

              {ai.moduleView.kind === 'index_unavailable' && !currentChat && (
                <div className="semantic-state">
                  <Typography variant="body" color="var(--color-text-secondary)" className="semantic-state__copy">
                    选择左侧联系人后即可使用 AI 功能
                  </Typography>
                </div>
              )}

              {ai.moduleView.kind === 'index_unavailable' && currentChat && (
                <div className="semantic-state">
                  <Typography variant="body" color="var(--color-text-secondary)" className="semantic-state__copy">
                    {ai.moduleView.message}
                  </Typography>
                  <Button variant="primary" size="sm" onClick={() => ai.doIndexAction('rebuild')}>
                    构建索引
                  </Button>
                </div>
              )}

              {ai.moduleView.kind === 'index_running' && (
                <div className="semantic-state">
                  <ProgressBar
                    progress={indexProgress}
                    label="正在构建语义索引..."
                    variant={indexProgress === 0 ? 'indeterminate' : 'default'}
                  />
                  <div className="semantic-actions">
                    <Button variant="secondary" size="sm" onClick={() => ai.doIndexAction('pause')}>
                      暂停
                    </Button>
                  </div>
                </div>
              )}

              {ai.moduleView.kind === 'index_paused' && (
                <div className="semantic-state">
                  <Typography variant="body" color="var(--color-text-secondary)" className="semantic-state__copy">
                    {ai.moduleView.message}
                  </Typography>
                  <Button variant="primary" size="sm" onClick={() => ai.doIndexAction('resume')}>
                    恢复索引
                  </Button>
                </div>
              )}

              {ai.moduleView.kind === 'ready' && (
                <>
                  <SemanticDiscoveryContextBar view={ai.discoveryView} />
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
                    <div className="semantic-state">
                      <Typography variant="body" color="var(--color-text-secondary)">
                        选择左侧联系人后即可开始 AI 问答
                      </Typography>
                    </div>
                  )}
                  {activeTab === 'search' && (
                    <SemanticSearch
                      query={ai.searchQuery}
                      scope={ai.searchScope}
                      selectedChats={ai.selectedSearchChats}
                      window={ai.discoveryWindow}
                      depth={ai.searchDepth}
                      sourceLimit={ai.searchSourceLimit}
                      rerank={ai.searchRerank}
                      discoveryView={ai.discoveryView}
                      searchResults={ai.searchResults}
                      searchLoading={ai.searchLoading}
                      searchError={ai.searchError}
                      navigationNote={ai.searchNavigationNote}
                      privacyOn={privacyOn}
                      onQueryChange={ai.setSearchQuery}
                      onSearch={ai.debouncedSearch}
                      onSubmitSearch={() => ai.semanticSearch()}
                      onScopeChange={ai.setSearchScope}
                      onSelectedChatsChange={ai.setSelectedSearchChats}
                      onWindowChange={ai.setDiscoveryWindow}
                      onDepthChange={ai.setSearchDepth}
                      onSourceLimitChange={ai.setSearchSourceLimit}
                      onRerankChange={ai.setSearchRerank}
                      onRetry={() => ai.semanticSearch()}
                      onSelectResult={(result) => {
                        const target = ai.resolveSearchResult(result);
                        if (target.kind === "ready") {
                          onSelectAndLoad(target.conversationId, target.chat);
                        }
                      }}
                    />
                  )}
                  {activeTab === 'analysis' && !!currentChat && (
                    <div className="semantic-analysis-stack">
                      <TopicView
                        view={ai.discoveryView.topics}
                        loading={ai.topicsLoading}
                        error={ai.topicsError}
                        onRetry={ai.loadAnalysis}
                      />
                      <ContactProfile
                        view={ai.discoveryView.profile}
                        loading={ai.profileLoading}
                        error={ai.profileError}
                        onRetry={ai.loadAnalysis}
                        onAskAboutSender={(senderId) => {
                          setActiveTab("qa");
                          ai.askAboutSender(senderId);
                        }}
                      />
                    </div>
                  )}
                  {activeTab === 'analysis' && !currentChat && (
                    <div className="semantic-state">
                      <Typography variant="body" color="var(--color-text-secondary)">
                        选择左侧联系人后即可查看分析
                      </Typography>
                    </div>
                  )}
                  {activeTab === 'preview' && (
                    <SemanticIndexPreview
                      view={ai.semanticPreviewView}
                      kind={ai.previewKind}
                      talker={ai.previewTalker}
                      talkerOptions={ai.discoveryView.previewTalkerOptions}
                      limit={ai.previewLimit}
                      privacyOn={privacyOn}
                      onKindChange={ai.setPreviewKind}
                      onTalkerChange={ai.setPreviewTalker}
                      onLimitChange={ai.setPreviewLimit}
                      onRefresh={() => ai.loadPreview()}
                      onPreviousPage={ai.loadPreviousPreviewPage}
                      onNextPage={ai.loadNextPreviewPage}
                    />
                  )}
                </>
              )}

              {ai.moduleView.kind === 'failed' && (
                <div className="semantic-state">
                  <Typography variant="body" color="var(--danger)" className="semantic-state__copy">
                    {ai.moduleView.message || ai.error || '发生未知错误'}
                  </Typography>
                  <Button variant="secondary" size="sm" onClick={() => { ai.clearError(); ai.initialize(); }}>
                    重试
                  </Button>
                </div>
              )}

              {ai.moduleView.kind === 'ready' && (activeTab === 'analysis' || activeTab === 'preview') && (
                <div className="semantic-footer">
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    索引已就绪 · {ai.indexStatus?.completed?.toLocaleString() || 0} 条已索引
                  </Typography>
                  <div className="semantic-footer__actions">
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
