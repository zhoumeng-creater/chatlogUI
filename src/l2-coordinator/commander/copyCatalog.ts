export type CopyTier = "user" | "diagnostic";

export type CopyContext =
  | "settings-user"
  | "setup"
  | "workbench"
  | "search"
  | "stats"
  | "sns"
  | "export"
  | "about"
  | "diagnostics"
  | "developer";

export type PrivacyCopySurface =
  | "visible"
  | "tooltip"
  | "aria"
  | "copy"
  | "export"
  | "diagnostics"
  | "screenshot";

interface CopyTerm {
  tier: CopyTier;
  label: string;
  variants?: string[];
}

export const COPY_CATALOG = {
  user: {
    localChatService: userTerm("本机聊天服务"),
    dataDirectory: userTerm("数据目录"),
    database: userTerm("数据库"),
    keyConfigured: userTerm("密钥已配置"),
    workspace: userTerm("工作台"),
    diagnostics: userTerm("诊断"),
    aiWorkspace: userTerm("AI 工作台"),
    semanticIndex: userTerm("语义索引"),
    export: userTerm("导出"),
    privacyMode: userTerm("隐私模式"),
  },
  diagnostic: {
    sidecar: diagnosticTerm("Sidecar"),
    http: diagnosticTerm("HTTP"),
    endpoint: diagnosticTerm("endpoint"),
    dataKey: diagnosticTerm("Data Key", ["dataKey"]),
    chatlogAlpha: diagnosticTerm("chatlog_alpha"),
    rawVersion: diagnosticTerm("raw version"),
    baseUrl: diagnosticTerm("base URL", ["baseUrl"]),
    providerKey: diagnosticTerm("provider key", ["API Key", "apiKey"]),
  },
} as const;

export const DIAGNOSTIC_COPY_CONTEXTS: CopyContext[] = ["about", "diagnostics", "developer"];

export const PRIVACY_COPY_RULES: Record<
  PrivacyCopySurface,
  {
    redacts: string[];
    allowedStructure: string[];
  }
> = {
  visible: privacyRule(
    ["private-labels", "message-content", "queries", "prompts", "raw-local-paths", "tokens"],
    ["counts", "time-ranges", "types", "modules", "readiness"],
  ),
  tooltip: privacyRule(
    ["private-labels", "message-content", "queries", "prompts", "raw-local-paths", "tokens"],
    ["types", "modules", "readiness"],
  ),
  aria: privacyRule(
    ["private-labels", "message-content", "queries", "prompts", "raw-local-paths", "tokens"],
    ["counts", "types", "modules", "readiness"],
  ),
  copy: privacyRule(
    ["private-labels", "message-content", "queries", "prompts", "raw-local-paths", "tokens"],
    ["counts", "time-ranges", "types", "modules", "readiness"],
  ),
  export: privacyRule(
    ["private-labels", "message-content", "queries", "prompts", "raw-local-paths", "tokens"],
    ["counts", "time-ranges", "types", "modules", "readiness", "redaction-policy"],
  ),
  diagnostics: privacyRule(
    ["private-labels", "message-content", "queries", "prompts", "raw-local-paths", "tokens"],
    ["counts", "time-ranges", "types", "modules", "readiness", "safe-event-family"],
  ),
  screenshot: privacyRule(
    ["private-labels", "message-content", "queries", "prompts", "raw-local-paths", "tokens"],
    ["counts", "time-ranges", "types", "modules", "readiness"],
  ),
};

export function isDiagnosticTermAllowed(term: string, context: CopyContext): boolean {
  if (!isDiagnosticTerm(term)) return true;
  return DIAGNOSTIC_COPY_CONTEXTS.includes(context);
}

export function getDisallowedDiagnosticTerms(copy: string, context: CopyContext = "settings-user"): string[] {
  if (DIAGNOSTIC_COPY_CONTEXTS.includes(context)) return [];
  return getDiagnosticTermLabels().filter((term) => copyContainsTerm(copy, term));
}

function userTerm(label: string): CopyTerm {
  return { tier: "user", label };
}

function diagnosticTerm(label: string, variants: string[] = []): CopyTerm {
  return { tier: "diagnostic", label, variants };
}

function privacyRule(redacts: string[], allowedStructure: string[]) {
  return { redacts, allowedStructure };
}

function isDiagnosticTerm(term: string): boolean {
  return getDiagnosticTermLabels().some((candidate) => candidate.toLowerCase() === term.toLowerCase());
}

function getDiagnosticTermLabels(): string[] {
  return Object.values(COPY_CATALOG.diagnostic).flatMap((term) => [term.label, ...(term.variants ?? [])]);
}

function copyContainsTerm(copy: string, term: string): boolean {
  return copy.toLowerCase().includes(term.toLowerCase());
}
