import { useRef, useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { classNames } from '@/utils/classNames';
import { Typography } from '@l4/ui/Typography';
import { Button } from '@l4/ui/Button';
import { IconButton } from '@l4/ui/IconButton';
import { Spinner } from '@l4/ui/Spinner';
import { QAPanel } from './QAPanel';
import { SemanticSearch } from './SemanticSearch';
import { TopicView } from './TopicView';
import { ContactProfile } from './ContactProfile';
import { SemanticIndexPreview } from './SemanticIndexPreview';
import { SemanticDiscoveryPanel } from './SemanticDiscoveryPanel';
import { SemanticSetupCenter } from './SemanticSetupCenter';
import { SemanticIndexCenter } from './SemanticIndexCenter';
import { SetupWizard } from './SetupWizard';
import type { useAiCommander } from '@l2/commander/useAiCommander';

type AiTab = 'qa' | 'search' | 'analysis' | 'preview';
type AiCommander = ReturnType<typeof useAiCommander>;

interface AiPanelProps {
  ai: AiCommander;
  openSetupOnMount?: boolean;
  currentChat: string;
  currentContact: string;
  privacyOn: boolean;
  onSelectEvidenceSource: (chat: string, label: string, localId?: number) => void;
}

export function AiPanel({
  ai,
  openSetupOnMount = false,
  currentChat,
  currentContact,
  privacyOn,
  onSelectEvidenceSource,
}: AiPanelProps) {
  const [activeTab, setActiveTab] = useState<AiTab>('qa');
  const [showWizard, setShowWizard] = useState(false);
  const aiRef = useRef(ai);
  const analysisRequestKey = useRef<string | null>(null);
  const routeSetupOpenedRef = useRef(false);

  useEffect(() => {
    aiRef.current = ai;
  }, [ai]);

  useEffect(() => {
    aiRef.current.initialize();
  }, []);

  useEffect(() => {
    if (!openSetupOnMount) {
      routeSetupOpenedRef.current = false;
      return;
    }
    if (routeSetupOpenedRef.current) return;
    if (ai.moduleView.kind === 'checking_config') return;
    routeSetupOpenedRef.current = true;
    if (ai.moduleView.kind !== 'setup_required') {
      setShowWizard(true);
    }
  }, [ai.moduleView.kind, openSetupOnMount]);

  useEffect(() => {
    if (activeTab !== 'analysis' || !currentChat) return;
    const key = `${currentChat}:${ai.indexStatus?.status ?? "unknown"}:${ai.indexStatus?.completed ?? 0}`;
    if (analysisRequestKey.current === key) return;
    analysisRequestKey.current = key;
    aiRef.current.loadAnalysis();
  }, [activeTab, ai.indexStatus?.completed, ai.indexStatus?.status, currentChat]);

  useEffect(() => {
    if (activeTab !== 'preview') return;
    aiRef.current.loadPreview();
  }, [activeTab]);

  const tabs: { key: AiTab; label: string }[] = [
    { key: 'qa', label: '问答' },
    { key: 'search', label: '搜索' },
    { key: 'analysis', label: '分析' },
    { key: 'preview', label: '预览' },
  ];

  const showIndexCenter =
    ai.moduleView.kind !== 'checking_config'
    && ai.moduleView.kind !== 'setup_required';

  return (
    <div className="semantic-panel">
      <div className="semantic-panel__actions">
        <IconButton
          label="AI 设置"
          tooltip="AI 设置"
          icon={<Settings size={15} />}
          onClick={() => setShowWizard(true)}
        />
      </div>

      {ai.moduleView.kind === 'ready' && (
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
            <div className="semantic-panel__content">
              {ai.moduleView.kind === 'checking_config' && (
                <div className="semantic-state semantic-state--loose">
                  <Spinner size={24} label="正在检查 AI 配置..." />
                </div>
              )}

              {ai.moduleView.kind === 'setup_required' && (
                <SemanticSetupCenter
                  initialDraft={ai.setupDraft}
                  getSetupView={ai.getSetupView}
                  onTestConnection={ai.testConnection}
                  onSave={ai.saveConfig}
                  privacyOn={privacyOn}
                  compact
                />
              )}

              {showIndexCenter && (
                <SemanticIndexCenter view={ai.indexCenterView} onAction={ai.doIndexAction} />
              )}

              {ai.moduleView.kind === 'ready' && (
                <SemanticDiscoveryPanel
                  view={ai.semanticDiscoveryView}
                  onRefresh={() => {
                    if (activeTab === 'analysis') ai.loadAnalysis();
                    if (activeTab === 'preview') ai.loadPreview();
                    if (activeTab === 'search') ai.semanticSearch(ai.searchQuery);
                  }}
                >
                  {activeTab === 'qa' && (
                    <QAPanel
                      qaMessages={ai.qaMessages}
                      recentChats={ai.qaRecentChats}
                      qaStreaming={ai.qaStreaming}
                      qaStatus={ai.qaStatus}
                      qaError={ai.qaError}
                      currentContact={currentContact}
                      privacyOn={privacyOn}
                      onAskQuestion={ai.askQuestion}
                      onStopQAStream={ai.stopQAStream}
                      onRetryQAMessage={ai.retryQAMessage}
                      onCopyQAMessageAnswer={ai.copyQAMessageAnswer}
                      onClearQAMessages={ai.clearQAMessages}
                      onSelectEvidenceSource={onSelectEvidenceSource}
                    />
                  )}
                  {activeTab === 'search' && (
                    <SemanticSearch
                      view={ai.semanticDiscoveryView.search}
                      query={ai.searchQuery}
                      scope={ai.discoverySearchScope}
                      window={ai.discoveryWindow}
                      depth={ai.discoveryDepth}
                      sourceLimit={ai.discoverySourceLimit}
                      rerank={ai.discoveryRerank}
                      onSearch={ai.debouncedSearch}
                      onScopeChange={ai.setDiscoverySearchScope}
                      onWindowChange={ai.setDiscoveryWindow}
                      onDepthChange={ai.setDiscoveryDepth}
                      onSourceLimitChange={ai.setDiscoverySourceLimit}
                      onRerankChange={ai.setDiscoveryRerank}
                      onRetry={() => ai.semanticSearch(ai.searchQuery)}
                      onSelectResult={ai.openSemanticSearchResult}
                    />
                  )}
                  {activeTab === 'analysis' && !!currentChat && (
                    <div className="semantic-analysis-stack">
                      <TopicView
                        view={ai.semanticDiscoveryView.topics}
                        onRetry={ai.loadAnalysis}
                      />
                      <ContactProfile
                        view={ai.semanticDiscoveryView.profile}
                        onRetry={ai.loadAnalysis}
                        onAskSender={(sender) => ai.askQuestion({
                          query: "请总结这个对象近期的重点。",
                          scope: "contact",
                          window: ai.discoveryWindow,
                          entityOverride: sender,
                        })}
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
                      limit={ai.previewLimit}
                      talker={ai.previewTalker}
                      talkerOptions={ai.previewTalkerOptions}
                      privacyOn={privacyOn}
                      onKindChange={ai.setPreviewKind}
                      onLimitChange={ai.setPreviewLimit}
                      onTalkerChange={ai.setPreviewTalker}
                      onRefresh={() => ai.loadPreview()}
                      onPreviousPage={ai.loadPreviousPreviewPage}
                      onNextPage={ai.loadNextPreviewPage}
                    />
                  )}
                </SemanticDiscoveryPanel>
              )}

              {ai.moduleView.kind === 'failed' && !ai.indexStatus && (
                <div className="semantic-state">
                  <Typography variant="body" color="var(--danger)" className="semantic-state__copy">
                    {ai.moduleView.message || ai.error || '发生未知错误'}
                  </Typography>
                  <Button variant="secondary" size="sm" onClick={() => { ai.clearError(); ai.initialize(); }}>
                    重试
                  </Button>
                </div>
              )}
            </div>
      </div>

      {showWizard && (
        <SetupWizard
          onClose={() => setShowWizard(false)}
          initialDraft={ai.setupDraft}
          getSetupView={ai.getSetupView}
          testConnection={ai.testConnection}
          saveConfig={ai.saveConfig}
          privacyOn={privacyOn}
        />
      )}
    </div>
  );
}
