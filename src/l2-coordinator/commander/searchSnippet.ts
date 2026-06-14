import { maskDisplayText } from "@/utils/privacyDisplay";

export interface SearchSnippetSegment {
  text: string;
  highlight: boolean;
}

export interface SearchSnippet {
  text: string;
  segments: SearchSnippetSegment[];
  truncated: boolean;
  matchCount: number;
}

export interface CreateSearchSnippetInput {
  content: string;
  query: string;
  privacyOn: boolean;
  maxChars?: number;
}

export function createSearchSnippet({
  content,
  query,
  privacyOn,
  maxChars = 120,
}: CreateSearchSnippetInput): SearchSnippet {
  if (privacyOn) {
    const text = maskDisplayText(content || "[空消息]");
    return {
      text,
      segments: [{ text, highlight: false }],
      truncated: false,
      matchCount: 0,
    };
  }

  const normalizedContent = content || "[空消息]";
  const term = query.trim();
  if (!term) {
    return buildPlainSnippet(normalizedContent, maxChars);
  }

  const lowerContent = normalizedContent.toLocaleLowerCase();
  const lowerTerm = term.toLocaleLowerCase();
  const firstIndex = lowerContent.indexOf(lowerTerm);
  if (firstIndex < 0) {
    return buildPlainSnippet(normalizedContent, maxChars);
  }

  const context = Math.max(0, Math.floor((maxChars - term.length) / 2));
  const start = Math.max(0, firstIndex - context);
  const end = Math.min(normalizedContent.length, start + maxChars);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalizedContent.length ? "..." : "";
  const text = `${prefix}${normalizedContent.slice(start, end)}${suffix}`;
  const segments = segmentSnippet(text, term);

  return {
    text,
    segments,
    truncated: prefix.length > 0 || suffix.length > 0,
    matchCount: countMatches(normalizedContent, term),
  };
}

function buildPlainSnippet(content: string, maxChars: number): SearchSnippet {
  const truncated = content.length > maxChars;
  const text = truncated ? `${content.slice(0, maxChars)}...` : content;
  return {
    text,
    segments: [{ text, highlight: false }],
    truncated,
    matchCount: 0,
  };
}

function segmentSnippet(text: string, term: string): SearchSnippetSegment[] {
  const regex = new RegExp(escapeRegExp(term), "gi");
  const segments: SearchSnippetSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), highlight: false });
    }
    segments.push({ text: match[0], highlight: true });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlight: false });
  }
  return segments.length > 0 ? segments : [{ text, highlight: false }];
}

function countMatches(content: string, term: string): number {
  return Array.from(content.matchAll(new RegExp(escapeRegExp(term), "gi"))).length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
