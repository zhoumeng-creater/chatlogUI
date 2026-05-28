import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Typography } from '@l4/ui/Typography';
import { AppleButton } from '@l4/ui/AppleButton';
import { ProgressBar } from '@l4/ui/ProgressBar';
import { Spinner } from '@l4/ui/Spinner';
import { QAPanel } from './QAPanel';
import { SemanticSearch } from './SemanticSearch';
import { TopicView } from './TopicView';
import { ContactProfile } from './ContactProfile';
import { SetupWizard } from './SetupWizard';
import { useChatCommander } from '@l2/commander/useChatCommander';
import { useAiCommander } from '@l2/commander/useAiCommander';

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
  const { selectedContact, selectedChatRoom } = useChatCommander();
  const currentChat = selectedContact?.userName || selectedChatRoom?.name;

  useEffect(() => {
    if (mode === 'ai') {
      ai.initialize();
    }
  }, [mode, ai]);

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
        <AppleButton
          variant={mode === 'stats' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('stats')}
        >
          统计
        </AppleButton>
        <AppleButton
          variant={mode === 'ai' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('ai')}
        >
          AI
        </AppleButton>
        {mode === 'ai' && ai.phase !== 'not_configured' && (
          <div style={{ flex: 1 }} />
        )}
        {mode === 'ai' && ai.phase !== 'not_configured' && (
          <AppleButton
            variant="ghost"
            size="sm"
            onClick={() => setShowWizard(true)}
            style={{ padding: '0 6px' }}
          >
            ⚙
          </AppleButton>
        )}
      </div>

      {mode === 'ai' && ai.phase !== 'not_configured' && ai.phase !== 'configuring' && (
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color:
                  activeTab === tab.key
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-tertiary)',
                borderBottom:
                  activeTab === tab.key
                    ? '2px solid #007AFF'
                    : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {mode === 'ai' && (
            <motion.div
              key="ai-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ height: '100%' }}
            >
              {(ai.phase === 'idle' || ai.phase === 'checking_config') && (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Spinner size={24} label="正在检查 AI 配置..." />
                </div>
              )}

              {ai.phase === 'not_configured' && (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography variant="h3" style={{ marginBottom: 8 }}>
                    AI 功能尚未配置
                  </Typography>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 20 }}>
                    配置 AI 服务后即可体验智能问答、语义搜索和联系人分析
                  </Typography>
                  <AppleButton variant="primary" onClick={() => setShowWizard(true)}>
                    开始配置
                  </AppleButton>
                </div>
              )}

              {ai.phase === 'index_not_built' && !currentChat && (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 12 }}>
                    选择左侧联系人后即可使用 AI 功能
                  </Typography>
                </div>
              )}

              {ai.phase === 'index_not_built' && currentChat && (
                <div style={{ padding: 24 }}>
                  <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 12 }}>
                    语义索引尚未构建，AI 功能需要索引后才能使用
                  </Typography>
                  <AppleButton variant="primary" size="sm" onClick={() => ai.doIndexAction('rebuild')}>
                    构建索引
                  </AppleButton>
                </div>
              )}

              {ai.phase === 'index_building' && (
                <div style={{ padding: 24 }}>
                  <ProgressBar
                    progress={indexProgress}
                    label="正在构建语义索引..."
                    variant={indexProgress === 0 ? 'indeterminate' : 'default'}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <AppleButton variant="secondary" size="sm" onClick={() => ai.doIndexAction('pause')}>
                      暂停
                    </AppleButton>
                  </div>
                </div>
              )}

              {ai.phase === 'index_ready' && (
                <>
                  {activeTab === 'qa' && !!currentChat && <QAPanel />}
                  {activeTab === 'qa' && !currentChat && (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <Typography variant="body" color="var(--color-text-secondary)">
                        选择左侧联系人后即可开始 AI 问答
                      </Typography>
                    </div>
                  )}
                  {activeTab === 'search' && <SemanticSearch />}
                  {activeTab === 'analysis' && !!currentChat && (
                    <div style={{ padding: 12 }}>
                      <TopicView />
                      <ContactProfile />
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

              {ai.phase === 'error' && (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Typography variant="body" color="#FF3B30" style={{ marginBottom: 12 }}>
                    {ai.error || '发生未知错误'}
                  </Typography>
                  <AppleButton variant="secondary" size="sm" onClick={() => { ai.clearError(); ai.initialize(); }}>
                    重试
                  </AppleButton>
                </div>
              )}

              {ai.phase === 'index_ready' && activeTab === 'analysis' && (
                <div style={{ padding: '4px 12px', borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    索引已就绪 · {ai.indexStatus?.completed?.toLocaleString() || 0} 条已索引
                  </Typography>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <AppleButton variant="ghost" size="sm" onClick={() => ai.doIndexAction('rebuild')}>
                      重建索引
                    </AppleButton>
                    <AppleButton variant="ghost" size="sm" onClick={() => ai.doIndexAction('clear')}>
                      清空索引
                    </AppleButton>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showWizard && <SetupWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}
