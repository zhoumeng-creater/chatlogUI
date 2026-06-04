export type SemanticAnswerSegment =
  | { type: "heading"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; text: string; language?: string };

export interface SemanticProfileDisplayInput {
  sender: string;
  senderName: string;
  messages: number;
  topKeywords: Array<{ topic: string; count: number }>;
}

export interface SemanticProfileDisplayRow {
  sender: string;
  messages: string;
  keywords: string[];
}

export interface SemanticEvidenceContextRow {
  time: string;
  senderLabel: string;
  content: string;
}

export interface SemanticEvidenceDisplayRow {
  index: number;
  time: string;
  chatLabel: string;
  senderLabel: string;
  sourceLabel: string;
  scoreLabel: string;
  rerankScoreLabel: string;
  content: string;
  contextRows: SemanticEvidenceContextRow[];
  chat: string;
  localId: number;
}

export interface SemanticEntityCandidateDisplayRow {
  displayLabel: string;
  usernameLabel: string;
  kindLabel: string;
  sourceLabel: string;
  entityOverride: string;
}

export function getSemanticAnswerSegments(content: string): SemanticAnswerSegment[] {
  const segments: SemanticAnswerSegment[] = [];
  const lines = content.split(/\r?\n/);
  let codeLanguage: string | undefined;
  let codeLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const fence = line.match(/^```(\w+)?\s*$/);

    if (fence && codeLanguage === undefined && codeLines.length === 0) {
      codeLanguage = fence[1] || "";
      codeLines = [];
      continue;
    }

    if (fence && (codeLanguage !== undefined || codeLines.length > 0)) {
      const code = codeLines.join("\n").trim();
      if (code) {
        segments.push({
          type: "code",
          text: code,
          language: codeLanguage || undefined,
        });
      }
      codeLanguage = undefined;
      codeLines = [];
      continue;
    }

    if (codeLanguage !== undefined || codeLines.length > 0) {
      codeLines.push(rawLine);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^#{1,3}\s+/.test(trimmed)) {
      segments.push({
        type: "heading",
        text: normalizeInlineMarkdown(trimmed.replace(/^#{1,3}\s+/, "")),
      });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      segments.push({
        type: "bullet",
        text: normalizeInlineMarkdown(trimmed.replace(/^[-*]\s+/, "")),
      });
      continue;
    }

    segments.push({
      type: "paragraph",
      text: normalizeInlineMarkdown(trimmed),
    });
  }

  if (codeLines.length > 0) {
    const code = codeLines.join("\n").trim();
    if (code) {
      segments.push({
        type: "code",
        text: code,
        language: codeLanguage || undefined,
      });
    }
  }

  return segments;
}

export function getSemanticDisplayText(value: string | undefined, privacyOn: boolean, fallback = ""): string {
  const text = (value ?? "").trim() || fallback;
  return privacyOn ? text.replace(/[^\s]/g, "*") : text;
}

export function getSemanticProfileRows(
  profiles: SemanticProfileDisplayInput[] | undefined,
  privacyOn: boolean,
): SemanticProfileDisplayRow[] {
  return (profiles ?? []).map((profile) => ({
    sender: getSemanticDisplayText(profile.senderName || profile.sender, privacyOn, "未知联系人"),
    messages: `${profile.messages.toLocaleString()} 条`,
    keywords: profile.topKeywords.map((keyword) =>
      `${getSemanticDisplayText(keyword.topic, privacyOn)} (${keyword.count})`,
    ),
  }));
}

export function getSemanticTypeDistributionRows(
  distribution: Array<{ type: string; count: number }> | undefined,
): string[] {
  return (distribution ?? []).map((entry) => `${entry.type}: ${entry.count}`);
}

export function getSemanticEvidenceRows(
  evidence: Array<Record<string, unknown>> | undefined,
  privacyOn: boolean,
): SemanticEvidenceDisplayRow[] {
  return (evidence ?? []).map((entry, index) => {
    const row = asRecord(entry);
    const chat = stringValue(row.talker) || stringValue(row.chat);
    const sender = stringValue(row.sender);
    const source = stringValue(row.source) || "message";
    const chunkType = stringValue(row.chunk_type);
    return {
      index: index + 1,
      time: semanticDisplayTime(row.time),
      chatLabel: getSemanticDisplayText(
        stringValue(row.talker_name) || stringValue(row.chat_name) || chat,
        privacyOn,
        "未知会话",
      ),
      senderLabel: getSemanticDisplayText(
        stringValue(row.sender_name) || sender,
        privacyOn,
        "未知发送者",
      ),
      sourceLabel: chunkType ? `${source} / ${chunkType}` : source,
      scoreLabel: scoreLabel("score", row.score),
      rerankScoreLabel: scoreLabel("rerank", row.rerank_score),
      content: getSemanticDisplayText(
        stringValue(row.content) || stringValue(row.snippet) || stringValue(row.text),
        privacyOn,
        "无证据内容",
      ),
      contextRows: getSemanticEvidenceContextRows(row.context, privacyOn),
      chat,
      localId: numberValue(row.seq, numberValue(row.local_id)),
    };
  });
}

export function getSemanticMetadataChips(metadata: Record<string, unknown> | undefined): string[] {
  const data = asRecord(metadata);
  const chips: string[] = [];
  const sourceCount = numberValue(data.sourceCount, numberValue(data.source_count, -1));
  const evidenceCount = numberValue(data.evidenceCount, numberValue(data.count, -1));
  const window = stringValue(data.window);
  const depth = stringValue(data.depth);
  const rerankTried = boolValue(data.rerankTried, boolValue(data.rerank_tried));
  const rerankApplied = boolValue(data.rerankApplied, boolValue(data.rerank_applied));
  const rerankError = stringValue(data.rerankError) || stringValue(data.rerank_error);
  const entityCandidateCount = numberValue(
    data.entityCandidateCount,
    numberValue(data.entity_candidate_count, getSemanticEntityCandidateRows(data, false).length),
  );
  const entityAmbiguous = boolValue(data.entityAmbiguous, boolValue(data.entity_ambiguous));

  if (sourceCount >= 0) chips.push(`数据源 ${sourceCount}`);
  if (window) chips.push(`时间窗 ${window}`);
  if (depth) chips.push(`深度 ${depth}`);
  if (evidenceCount >= 0) chips.push(`证据 ${evidenceCount}`);
  if (rerankApplied) {
    chips.push("Rerank 已应用");
  } else if (rerankTried) {
    chips.push("Rerank 未应用");
  } else if ("rerankTried" in data || "rerank_tried" in data) {
    chips.push("Rerank 未尝试");
  }
  if (rerankError) chips.push(`Rerank: ${rerankError}`);
  if (entityCandidateCount > 0) {
    chips.push(`候选 ${entityCandidateCount}${entityAmbiguous ? " · 有歧义" : ""}`);
  }
  return chips;
}

export function getSemanticEntityCandidateRows(
  metadata: Record<string, unknown> | undefined,
  privacyOn: boolean,
): SemanticEntityCandidateDisplayRow[] {
  const data = asRecord(metadata);
  const candidates = arrayValue(data.entityCandidates).length > 0
    ? arrayValue(data.entityCandidates)
    : arrayValue(data.entity_candidates);

  return candidates
    .map((candidate) => {
      const row = asRecord(candidate);
      const username = stringValue(row.username);
      const display = stringValue(row.display) || stringValue(row.name) || username;
      return {
        displayLabel: getSemanticDisplayText(display, privacyOn, "未知实体"),
        usernameLabel: getSemanticDisplayText(username, privacyOn, ""),
        kindLabel: getSemanticDisplayText(
          stringValue(row.kind) || stringValue(row.type),
          privacyOn,
          "未知类型",
        ),
        sourceLabel: getSemanticDisplayText(stringValue(row.source), privacyOn, "未知来源"),
        entityOverride: username,
      };
    })
    .filter((candidate) => candidate.displayLabel || candidate.entityOverride)
    .slice(0, 8);
}

function normalizeInlineMarkdown(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function getSemanticEvidenceContextRows(
  context: unknown,
  privacyOn: boolean,
): SemanticEvidenceContextRow[] {
  return arrayValue(context).slice(0, 6).map((entry) => {
    const row = asRecord(entry);
    const sender = stringValue(row.sender_name) || stringValue(row.sender);
    return {
      time: semanticDisplayTime(row.time),
      senderLabel: getSemanticDisplayText(sender, privacyOn, "未知发送者"),
      content: getSemanticDisplayText(
        stringValue(row.content) || stringValue(row.snippet) || stringValue(row.text),
        privacyOn,
        "无上下文内容",
      ),
    };
  });
}

function semanticDisplayTime(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const millis = value > 100000000000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  return stringValue(value);
}

function scoreLabel(prefix: string, value: unknown): string {
  const score = numberValue(value, Number.NaN);
  return Number.isFinite(score)
    ? `${prefix} ${(Math.round((score + Number.EPSILON) * 10000) / 10000).toFixed(4)}`
    : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}
