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

function normalizeInlineMarkdown(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}
