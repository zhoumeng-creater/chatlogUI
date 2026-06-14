import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AiPanel } from "./AiPanel";

describe("AiPanel", () => {
  it("renders ready Q&A as the primary task before secondary discovery tabs", () => {
    const html = renderToStaticMarkup(
      <AiPanel
        ai={readyAiCommander()}
        currentChat="wxid_synthetic_current"
        currentContact="Synthetic Contact"
        privacyOn={false}
        onSelectEvidenceSource={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="AI 主任务"');
    expect(html).toContain("问当前范围");
    expect(html.indexOf("问当前范围")).toBeLessThan(html.indexOf("语义搜索"));
    expect(html.indexOf("问当前范围")).toBeLessThan(html.indexOf("语义索引"));
    expect(html).not.toContain("问答</button>");
    expect(html).not.toContain("搜索</button>");
    expect(html).not.toContain("分析</button>");
    expect(html).not.toContain("预览</button>");
  });

  it("makes the ready primary task focus the visible question input", () => {
    const html = renderToStaticMarkup(
      <AiPanel
        ai={readyAiCommander()}
        currentChat="wxid_synthetic_current"
        currentContact="Synthetic Contact"
        privacyOn={false}
        onSelectEvidenceSource={vi.fn()}
      />,
    );

    expect(html).toContain('id="semantic-qa-input"');
    expect(html).toContain('aria-controls="semantic-qa-input"');
    expect(html).toContain('class="ui-button ui-button--primary ui-button--md semantic-primary-task__action"');
  });

  it("does not expose four peer tabs while setup is the primary task", () => {
    const ai = readyAiCommander({
      moduleView: {
        kind: "setup_required",
        blocksCoreWorkbench: false,
        searchEnabled: false,
        qaEnabled: false,
        statusLabel: "Setup required",
        message: "Semantic provider configuration is required.",
      },
      primaryTaskView: {
        kind: "setup_required",
        title: "配置 AI",
        description: "先配置本机 AI 提供方。",
        primaryAction: { label: "打开 AI 设置", command: "open_setup" },
        secondaryActions: [],
        statusItems: [],
        canShowSecondaryTabs: false,
        ariaLiveMessage: "配置 AI",
      },
    });
    const html = renderToStaticMarkup(
      <AiPanel
        ai={ai}
        currentChat="wxid_synthetic_current"
        currentContact="Synthetic Contact"
        privacyOn={false}
        onSelectEvidenceSource={vi.fn()}
      />,
    );

    expect(html).toContain("配置 AI");
    expect(html).not.toContain("问答</button>");
    expect(html).not.toContain("搜索</button>");
    expect(html).not.toContain("分析</button>");
    expect(html).not.toContain("预览</button>");
  });
});

function readyAiCommander(overrides: Record<string, unknown> = {}) {
  return {
    moduleView: {
      kind: "ready",
      blocksCoreWorkbench: false,
      searchEnabled: true,
      qaEnabled: true,
      statusLabel: "Ready",
      message: "Semantic search and QA are ready.",
    },
    primaryTaskView: {
      kind: "ready",
      title: "问当前范围",
      description: "直接对当前会话提问。",
      primaryAction: { label: "输入问题", command: "focus_question", tone: "primary" },
      secondaryActions: [
        { label: "语义搜索", command: "open_search" },
        { label: "分析", command: "open_analysis" },
        { label: "预览", command: "open_preview" },
      ],
      statusItems: ["索引已就绪"],
      canShowSecondaryTabs: true,
      ariaLiveMessage: "问当前范围",
    },
    businessExport: {
      action: { label: "导出", disabled: true, disabledReason: "生成回答后可导出。", onClick: vi.fn() },
      dialog: {},
      isOpen: false,
    },
    indexStatus: { status: "ready", state: "ready", total: 1, completed: 1 },
    indexCenterView: {
      kind: "ready",
      title: "语义索引",
      message: "索引已就绪",
      metrics: [],
      primaryAction: null,
      secondaryActions: [],
      destructiveActions: [],
      progressPct: 100,
    },
    semanticDiscoveryView: {
      canUseDiscovery: true,
      context: {
        scopeLabel: "Synthetic Contact",
        windowLabel: "30 天",
        readinessLabel: "语义发现可用",
        privacyLabel: "隐私模式未开启",
      },
      search: {
        status: "idle",
        summary: "",
        error: "",
        rerankError: "",
        rows: [],
      },
      topics: {
        status: "idle",
        windowLabel: "",
        countLabel: "",
        summary: "",
        summaryError: "",
        truncatedLabel: "",
        rows: [],
        dailyRows: [],
      },
      profile: {
        status: "idle",
        windowLabel: "",
        countLabel: "",
        summary: "",
        summaryError: "",
        rows: [],
        typeRows: [],
      },
    },
    qaMessages: [],
    qaRecentChats: [],
    qaStreaming: false,
    qaStatus: "idle",
    qaError: null,
    searchQuery: "",
    discoverySearchScope: "contact",
    discoveryWindow: "30d",
    discoveryDepth: "standard",
    discoverySourceLimit: 50,
    discoveryRerank: true,
    semanticPreviewView: {
      status: "idle",
      title: "索引预览",
      summary: "",
      rows: [],
      groups: [],
      outliers: [],
      pagination: { currentStart: 0, currentEnd: 0, total: 0, hasPrevious: false, hasNext: false },
      error: "",
    },
    previewKind: "all",
    previewLimit: 20,
    previewTalker: "",
    previewTalkerOptions: [],
    setupDraft: {
      enabled: true,
      baseUrl: "https://example.invalid",
      ollamaBaseUrl: "http://127.0.0.1:11434",
      deepseekBaseUrl: "https://api.deepseek.com",
      embeddingProvider: "ollama",
      embeddingModel: "nomic",
      embeddingDimension: 768,
      rerankProvider: "ollama",
      rerankModel: "rerank",
      chatProvider: "glm",
      chatModel: "glm-5.1",
      chatThinking: false,
      chatMaxTokens: 4096,
      chatTemperature: 0.2,
      apiKeyInput: "",
      deepseekApiKeyInput: "",
      recallK: 30,
      topN: 8,
      similarityThreshold: 0.61,
      enableRerank: true,
      enableQa: true,
      enableTopics: true,
      enableProfiles: true,
      enableLlmChunk: false,
      realtimeIndex: true,
      indexWorkers: 1,
    },
    getSetupView: vi.fn(() => ({
      readiness: [],
      credentials: {
        apiKey: { state: "not_required", label: "无需远程密钥", tone: "neutral" },
        deepseek: { state: "not_required", label: "无需远程密钥", tone: "neutral" },
      },
      validation: {
        valid: true,
        fieldErrors: {},
        sectionErrors: { embedding: "", rerank: "", chat: "", advanced: "" },
        confirmations: [],
      },
    })),
    initialize: vi.fn(),
    testConnection: vi.fn(),
    saveConfig: vi.fn(),
    doIndexAction: vi.fn(),
    loadAnalysis: vi.fn(),
    loadPreview: vi.fn(),
    semanticSearch: vi.fn(),
    debouncedSearch: vi.fn(),
    setDiscoverySearchScope: vi.fn(),
    setDiscoveryWindow: vi.fn(),
    setDiscoveryDepth: vi.fn(),
    setDiscoverySourceLimit: vi.fn(),
    setDiscoveryRerank: vi.fn(),
    openSemanticSearchResult: vi.fn(),
    askQuestion: vi.fn(),
    stopQAStream: vi.fn(),
    retryQAMessage: vi.fn(),
    copyQAMessageAnswer: vi.fn(async () => true),
    clearQAMessages: vi.fn(),
    setPreviewKind: vi.fn(),
    setPreviewLimit: vi.fn(),
    setPreviewTalker: vi.fn(),
    loadPreviousPreviewPage: vi.fn(),
    loadNextPreviewPage: vi.fn(),
    ...overrides,
  } as never;
}
