import { useState } from 'react';
import { SpringModal } from '@l4/ui/SpringModal';
import { Typography } from '@l4/ui/Typography';
import { Button } from '@l4/ui/Button';
import { Input } from '@l4/ui/Input';
import { Spinner } from '@l4/ui/Spinner';
import { ProgressBar } from '@l4/ui/ProgressBar';

type LLMProvider = "ollama" | "glm" | "deepseek" | string;

interface SemanticConfig {
  provider?: LLMProvider;
  ollamaBaseUrl?: string;
  glmApiKey?: string;
  glmBaseUrl?: string;
  deepseekApiKey?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

interface ConnectionTestResult {
  ok?: boolean;
  success?: boolean;
  message: string;
  latencyMs?: number;
}

interface SetupWizardProps {
  onClose: () => void;
  testConnection: (provider: string, cfg: Record<string, string>) => Promise<ConnectionTestResult>;
  saveConfig: (config: SemanticConfig) => Promise<void>;
  doIndexAction: (action: "rebuild" | "pause" | "resume" | "clear") => Promise<void>;
  indexStatus: { total: number; completed: number } | null;
}

type WizardStep = 1 | 2 | 3;

export function SetupWizard({
  onClose,
  testConnection,
  saveConfig,
  doIndexAction,
  indexStatus,
}: SetupWizardProps) {
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
      return {
        provider: 'ollama',
        ollamaBaseUrl: ollamaUrl,
        enabled: true,
        embedding_provider: 'ollama',
        rerank_provider: 'ollama',
        chat_provider: 'ollama',
        embedding_model: 'nomic-embed-text',
        rerank_model: 'bge-reranker',
        chat_model: 'llama3',
        ollama_base_url: ollamaUrl,
        api_key: '',
        deepseek_api_key: '',
      } as SemanticConfig;
    } else if (provider === 'glm') {
      return {
        provider: 'glm',
        glmApiKey: apiKey,
        glmBaseUrl: baseUrl || undefined,
        enabled: true,
        embedding_provider: 'ollama',
        rerank_provider: 'ollama',
        chat_provider: 'glm',
        embedding_model: 'nomic-embed-text',
        rerank_model: 'bge-reranker',
        chat_model: 'glm-4',
        base_url: baseUrl || undefined,
        api_key: apiKey,
        deepseek_api_key: '',
      } as SemanticConfig;
    } else {
      return {
        provider: 'deepseek',
        deepseekApiKey: apiKey,
        enabled: true,
        embedding_provider: 'ollama',
        rerank_provider: 'ollama',
        chat_provider: 'deepseek',
        embedding_model: 'nomic-embed-text',
        rerank_model: 'bge-reranker',
        chat_model: 'deepseek-chat',
        deepseek_api_key: apiKey,
        api_key: '',
      } as SemanticConfig;
    }
  };

  const handleTest = async (): Promise<boolean> => {
    setTesting(true);
    setTestResult(null);
    const cfg = buildConfig();
    try {
      const result = await testConnection(provider, {
        ...(provider === 'ollama' ? { base_url: cfg.ollamaBaseUrl || '' } : { api_key: apiKey }),
      });
      setTestResult(result);
      return Boolean(result.ok ?? result.success);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndBuild = async () => {
    setBuildingIndex(true);
    await saveConfig(buildConfig());
    await doIndexAction('rebuild');
    setBuildingIndex(false);
    onClose();
  };

  const handleSaveOnly = async () => {
    await saveConfig(buildConfig());
    onClose();
  };

  const indexProgress =
    indexStatus && indexStatus.total > 0
      ? (indexStatus.completed / indexStatus.total) * 100
      : 0;

  return (
    <SpringModal onClose={onClose}>
      <form
        style={{ width: 480, maxWidth: '90vw' }}
        autoComplete="off"
        onSubmit={(event) => event.preventDefault()}
      >
        <Typography variant="h3" style={{ marginBottom: 8 }}>
          配置 AI 功能
        </Typography>
        <div className="semantic-step-meter" aria-label={`AI 配置步骤 ${step} / 3`}>
          {([1, 2, 3] as WizardStep[]).map((s) => (
            <div
              key={s}
              className={[
                "semantic-step-meter__bar",
                s <= step ? "semantic-step-meter__bar--active" : "",
              ].filter(Boolean).join(" ")}
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
              <Button
                key={opt.key}
                variant="ghost"
                className={[
                  "semantic-provider-card",
                  provider === opt.key ? "semantic-provider-card--selected" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setProvider(opt.key)}
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
              </Button>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
              <Button variant="ghost" onClick={onClose}>
                取消
              </Button>
              <Button variant="primary" onClick={() => setStep(2)}>
                下一步
              </Button>
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
                    autoComplete="off"
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
              <Button variant="ghost" onClick={() => setStep(1)}>
                上一步
              </Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={handleTest} disabled={testing}>
                  {testing ? <Spinner size={14} /> : '测试连接'}
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    const passed = await handleTest();
                    if (passed) setStep(3);
                  }}
                  disabled={testing}
                >
                  下一步
                </Button>
              </div>
            </div>
            {testResult && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: (testResult.ok ?? testResult.success) ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)',
                }}
              >
                <Typography variant="caption" color={(testResult.ok ?? testResult.success) ? 'var(--success)' : 'var(--danger)'}>
                  {(testResult.ok ?? testResult.success) ? '\u2713 ' : '\u2717 '}
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
              <Button variant="ghost" onClick={onClose}>
                稍后再说
              </Button>
              <Button variant="secondary" onClick={handleSaveOnly}>
                仅保存配置
              </Button>
              <Button variant="primary" onClick={handleSaveAndBuild} disabled={buildingIndex}>
                保存并构建索引
              </Button>
            </div>
          </div>
        )}
      </form>
    </SpringModal>
  );
}
