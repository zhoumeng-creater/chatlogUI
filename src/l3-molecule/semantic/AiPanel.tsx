import { useRef, useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { classNames } from '@/utils/classNames';
import { Typography } from '@l4/ui/Typography';
import { Button } from '@l4/ui/Button';
import { IconButton } from '@l4/ui/IconButton';
import { Spinner } from '@l4/ui/Spinner';
import { ExportActionButton } from '@l3/export';
import { ActionableEmptyState } from '@l3/common/ActionableEmptyState';
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
import type { SemanticPrimaryTaskCommand } from '@l2/commander/semanticPrimaryTaskModel';

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
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
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

  const primaryTask = ai.primaryTaskView;
  const showIndexCenter =
    ai.moduleView.kind !== 'checking_config'
    && ai.moduleView.kind !== 'setup_required'
    && ai.moduleView.kind !== 'ready';

  const focusQuestionInput = () => {
    setActiveTab('qa');
    runAfterNextFrame(() => {
      const input = questionInputRef.current;
      if (!input) return;
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
      input.focus();
    });
  };

  const handleTaskCommand = (command: SemanticPrimaryTaskCommand) => {
    if (command === 'open_setup') {
      setShowWizard(true);
      return;
    }
    if (command === 'build_index') {
      void ai.doIndexAction('build');
      return;
    }
    if (command === 'pause_index') {
      void ai.doIndexAction('pause');
      return;
    }
    if (command === 'resume_index') {
      void ai.doIndexAction('resume');
      return;
    }
    if (command === 'retry_index') {
      ai.clearError();
      ai.initialize();
      return;
    }
    if (command === 'focus_question') {
      focusQuestionInput();
      return;
    }
    const nextTab = tabForPrimaryTaskCommand(command);
    if (nextTab) setActiveTab(nextTab);
  };

  return (
    <div className="semantic-panel">
      <div className="semantic-panel__actions">
        <ExportActionButton {...ai.businessExport.action} />
        <IconButton
          label="AI 设置"
          tooltip="AI 设置"
          icon={<Settings size={15} />}
          onClick={() => setShowWizard(true)}
        />
      </div>

      <div className="semantic-panel__body">
            <div className="semantic-panel__content">
              <section
                className={classNames("semantic-primary-task", `semantic-primary-task--${primaryTask.kind}`)}
                aria-label="AI 主任务"
                aria-live="polite"
                data-coach-anchor="ai-primary-task"
              >
                <div className="semantic-primary-task__copy">
                  <Typography variant="label" weight={700}>{primaryTask.title}</Typography>
                  <Typography variant="caption" color="var(--color-text-secondary)">
                    {primaryTask.description}
                  </Typography>
                  {primaryTask.statusItems.length > 0 && (
                    <div className="semantic-primary-task__status" aria-label="AI 主任务状态">
                      {primaryTask.statusItems.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  )}
                  <span className="sr-only">{primaryTask.ariaLiveMessage}</span>
                </div>
                {primaryTask.primaryAction.command !== 'wait' && (
                  <Button
                    variant={buttonVariantForTask(primaryTask.primaryAction.tone)}
                    size="md"
                    className="semantic-primary-task__action"
                    aria-controls={primaryTask.primaryAction.command === 'focus_question' ? 'semantic-qa-input' : undefined}
                    onClick={() => handleTaskCommand(primaryTask.primaryAction.command)}
                  >
                    {primaryTask.primaryAction.label}
                  </Button>
                )}
              </section>

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
                <>
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
                    onExportQAMessage={ai.exportQAMessage}
                    getQAMessageExportDisabledReason={ai.getQAMessageExportDisabledReason}
                    onClearQAMessages={ai.clearQAMessages}
                    onSelectEvidenceSource={onSelectEvidenceSource}
                    questionInputRef={questionInputRef}
                  />

                  {primaryTask.canShowSecondaryTabs && (
                    <section className="semantic-panel__secondary" aria-label="语义索引与语义发现">
                      <div className="semantic-panel__secondary-header">
                        <Typography variant="caption" weight={700}>语义索引</Typography>
                        <div className="semantic-panel__secondary-actions">
                          {primaryTask.secondaryActions.map((action) => {
                            const tab = tabForPrimaryTaskCommand(action.command);
                            return (
                              <Button
                                key={action.command}
                                variant={activeTab === tab ? "secondary" : "ghost"}
                                size="sm"
                                className="semantic-panel__secondary-action"
                                onClick={() => handleTaskCommand(action.command)}
                              >
                                {secondaryTaskButtonLabel(action.command, action.label)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      {activeTab !== 'qa' && (
                        <SemanticDiscoveryPanel
                          view={ai.semanticDiscoveryView}
                          onRefresh={() => {
                            if (activeTab === 'analysis') ai.loadAnalysis();
                            if (activeTab === 'preview') ai.loadPreview();
                            if (activeTab === 'search') ai.semanticSearch(ai.searchQuery);
                          }}
                        >
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
                            <ActionableEmptyState
                              className="semantic-state"
                              model={ai.emptyStates.analysisNoConversation}
                            />
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
                    </section>
                  )}
                </>
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

function tabForPrimaryTaskCommand(command: SemanticPrimaryTaskCommand): AiTab | null {
  if (command === 'open_search') return 'search';
  if (command === 'open_analysis') return 'analysis';
  if (command === 'open_preview') return 'preview';
  if (command === 'focus_question') return 'qa';
  return null;
}

function runAfterNextFrame(callback: () => void): void {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(callback);
    return;
  }
  callback();
}

function buttonVariantForTask(
  tone: "primary" | "secondary" | "ghost" | "danger" | undefined,
): "primary" | "secondary" | "ghost" | "danger" {
  return tone ?? "secondary";
}

function secondaryTaskButtonLabel(command: SemanticPrimaryTaskCommand, fallback: string): string {
  if (command === 'open_search') return '语义搜索结果';
  if (command === 'open_analysis') return '会话分析视图';
  if (command === 'open_preview') return '索引预览数据';
  return fallback;
}
