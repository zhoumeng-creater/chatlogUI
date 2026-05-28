import { useState } from 'react';
import { SpringModal } from '@l4/ui/SpringModal';
import { Typography } from '@l4/ui/Typography';
import { AppleButton } from '@l4/ui/AppleButton';
import { Input } from '@l4/ui/Input';
import { Spinner } from '@l4/ui/Spinner';
import { ProgressBar } from '@l4/ui/ProgressBar';
import { useAiCommander } from '@l2/commander/useAiCommander';
import type { LLMProvider, SemanticConfig, ConnectionTestResult } from '@/l2-coordinator/api-docs/semantic';

interface SetupWizardProps {
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3;

export function SetupWizard({ onClose }: SetupWizardProps) {
  const ai = useAiCommander();
  const [step, setStep] = useState<WizardStep>(1);
  const [provider, setProvider] = useState<LLMProvider>('ollama');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [buildingIndex, setBuildingIndex] = useState(false);

  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const buildConfig = (): SemanticConfig => {
    if (provider === 'ollama') {
      return { provider: 'ollama', ollamaBaseUrl: ollamaUrl };
    } else if (provider === 'glm') {
      return { provider: 'glm', glmApiKey: apiKey, glmBaseUrl: baseUrl || undefined };
    } else {
      return { provider: 'deepseek', deepseekApiKey: apiKey };
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const cfg = buildConfig();
    const result = await ai.testConnection(provider, {
      ...(provider === 'ollama' ? { base_url: cfg.ollamaBaseUrl || '' } : { api_key: apiKey }),
    });
    setTestResult(result);
    setTesting(false);
  };

  const handleSaveAndBuild = async () => {
    setBuildingIndex(true);
    await ai.saveConfig(buildConfig());
    await ai.doIndexAction('rebuild');
    setBuildingIndex(false);
    onClose();
  };

  const handleSaveOnly = async () => {
    await ai.saveConfig(buildConfig());
    onClose();
  };

  const indexProgress =
    ai.indexStatus && ai.indexStatus.total > 0
      ? (ai.indexStatus.completed / ai.indexStatus.total) * 100
      : 0;

  return (
    <SpringModal onClose={onClose}>
      <div style={{ width: 480, maxWidth: '90vw' }}>
        <Typography variant="h3" style={{ marginBottom: 8 }}>
          配置 AI 功能
        </Typography>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([1, 2, 3] as WizardStep[]).map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: s <= step ? '#007AFF' : 'var(--color-border)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 16 }}>
              选择 AI 服务提供商
            </Typography>
            {[
              {
                key: 'ollama' as LLMProvider,
                name: 'Ollama (本地)',
                desc: '完全本地运行，无需网络，隐私安全',
                note: '需要自行安装 Ollama',
              },
              {
                key: 'glm' as LLMProvider,
                name: 'GLM (智谱AI)',
                desc: '云端服务，需 API Key，效果优秀',
                note: '需要填写 API Key',
              },
              {
                key: 'deepseek' as LLMProvider,
                name: 'DeepSeek',
                desc: '云端服务，性价比高',
                note: '需要填写 API Key',
              },
            ].map((opt) => (
              <div
                key={opt.key}
                onClick={() => setProvider(opt.key)}
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: provider === opt.key ? '2px solid #007AFF' : '1px solid var(--color-border)',
                  background: provider === opt.key ? 'rgba(0,122,255,0.06)' : 'transparent',
                }}
              >
                <Typography variant="body" weight={600}>
                  {opt.name}
                </Typography>
                <Typography variant="caption" color="var(--color-text-tertiary)">
                  {opt.desc}
                </Typography>
                <Typography variant="caption" color="var(--color-text-quaternary)">
                  {opt.note}
                </Typography>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
              <AppleButton variant="ghost" onClick={onClose}>
                取消
              </AppleButton>
              <AppleButton variant="primary" onClick={() => setStep(2)}>
                下一步
              </AppleButton>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 16 }}>
              填写连接配置
            </Typography>
            {provider === 'ollama' && (
              <div style={{ marginBottom: 12 }}>
                <Typography variant="caption" style={{ marginBottom: 4 }}>
                  Ollama 服务地址
                </Typography>
                <Input
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
            )}
            {(provider === 'glm' || provider === 'deepseek') && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <Typography variant="caption" style={{ marginBottom: 4 }}>
                    API Key
                  </Typography>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="输入 API Key"
                  />
                </div>
                {provider === 'glm' && (
                  <div style={{ marginBottom: 12 }}>
                    <Typography variant="caption" style={{ marginBottom: 4 }}>
                      Base URL (可选)
                    </Typography>
                    <Input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://open.bigmodel.cn/api/paas/v4"
                    />
                  </div>
                )}
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <AppleButton variant="ghost" onClick={() => setStep(1)}>
                上一步
              </AppleButton>
              <div style={{ display: 'flex', gap: 8 }}>
                <AppleButton variant="secondary" onClick={handleTest} disabled={testing}>
                  {testing ? <Spinner size={14} /> : '测试连接'}
                </AppleButton>
                <AppleButton variant="primary" onClick={() => { handleTest(); setStep(3); }} disabled={testing}>
                  下一步
                </AppleButton>
              </div>
            </div>
            {testResult && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: testResult.success ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)',
                }}
              >
                <Typography variant="caption" color={testResult.success ? '#34C759' : '#FF3B30'}>
                  {testResult.success ? '\u2713 ' : '\u2717 '}
                  {testResult.message}
                  {testResult.latencyMs ? ` (${testResult.latencyMs}ms)` : ''}
                </Typography>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <Typography variant="body" color="var(--color-text-secondary)" style={{ marginBottom: 16 }}>
              配置已完成，是否立即构建语义索引？
            </Typography>
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginBottom: 16 }}>
              索引构建可能需要几分钟时间，构建期间将无法使用 AI 问答和搜索功能。
            </Typography>

            {buildingIndex && (
              <div style={{ marginBottom: 16 }}>
                <ProgressBar
                  progress={indexProgress}
                  label="正在构建索引..."
                  variant={indexProgress === 0 ? 'indeterminate' : 'default'}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <AppleButton variant="ghost" onClick={onClose}>
                稍后再说
              </AppleButton>
              <AppleButton variant="secondary" onClick={handleSaveOnly}>
                仅保存配置
              </AppleButton>
              <AppleButton variant="primary" onClick={handleSaveAndBuild} disabled={buildingIndex}>
                保存并构建索引
              </AppleButton>
            </div>
          </div>
        )}
      </div>
    </SpringModal>
  );
}
