import {
  containsSensitiveDiagnosticText,
  maskDiagnosticText,
} from "@/utils/maskSecrets";

export type DiagnosticEventSource =
  | "http"
  | "sidecar"
  | "tauri"
  | "ui"
  | "ux"
  | "updater"
  | "release";

export type DiagnosticEventLevel = "debug" | "info" | "warn" | "error";

export type DiagnosticEventPrivacy = "safe" | "redacted" | "blocked";

export type DiagnosticRecoveryHint =
  | "retry"
  | "check-service"
  | "open-settings"
  | "privacy-blocked"
  | "none";

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  source: DiagnosticEventSource;
  level: DiagnosticEventLevel;
  privacy: DiagnosticEventPrivacy;
  category: string;
  summary: string;
  correlationId?: string;
  recoveryHint?: DiagnosticRecoveryHint;
  attributes?: DiagnosticEventAttributes;
}

export type DiagnosticEventAttributeValue = string | number | boolean | null;
export type DiagnosticEventAttributes = Record<string, DiagnosticEventAttributeValue>;

export interface CreateDiagnosticEventInput {
  source: DiagnosticEventSource;
  level: DiagnosticEventLevel;
  category: string;
  summary: string;
  privacy?: DiagnosticEventPrivacy;
  correlationId?: string;
  recoveryHint?: DiagnosticRecoveryHint;
  attributes?: Record<string, unknown>;
}

export interface CreateHttpDiagnosticEventInput {
  url?: string;
  method?: string;
  status?: number | null;
  durationMs?: number;
  endpointFamily?: string;
  errorKind?: "http-status" | "timeout" | "abort" | "network";
  retryable?: boolean;
  correlationId?: string;
  recoveryHint?: DiagnosticRecoveryHint;
}

export interface DiagnosticEventFactoryOptions {
  now?: () => string;
  nextId?: () => string;
}

const SAFE_ATTRIBUTE_KEYS = new Set([
  "endpointFamily",
  "pathTemplate",
  "method",
  "status",
  "durationMs",
  "errorKind",
  "retryable",
  "count",
  "eventCount",
  "redactionOk",
  "releaseGate",
]);

const UX_SAFE_ATTRIBUTE_KEYS = new Set([
  "module",
  "task",
  "outcome",
  "mode",
  "durationMs",
  "count",
  "eventCount",
  "resultCount",
  "filterCount",
  "scopeKind",
  "format",
  "redactionPolicy",
  "cancelKind",
  "nodeCount",
  "edgeCount",
  "evidenceCount",
  "sourceCount",
  "answerLengthBucket",
  "httpReady",
  "dbReady",
  "sourceModule",
  "rowCount",
  "recoveryAction",
  "rankBucket",
  "hasAnchor",
  "layout",
  "graphType",
  "cached",
  "errorKind",
]);

const RECOVERY_HINTS = new Set<DiagnosticRecoveryHint>([
  "retry",
  "check-service",
  "open-settings",
  "privacy-blocked",
  "none",
]);

let nextEventId = 0;

export function createDiagnosticEvent(
  input: CreateDiagnosticEventInput,
  options: DiagnosticEventFactoryOptions = {},
): DiagnosticEvent {
  const timestamp = options.now?.() ?? new Date().toISOString();
  const id = options.nextId?.() ?? `diagnostic-${nextEventId++}`;

  if (input.privacy === "blocked") {
    return {
      id,
      timestamp,
      source: input.source,
      level: input.level,
      privacy: "blocked",
      category: input.category,
      summary: "[blocked diagnostic event]",
      correlationId: sanitizeCorrelationId(input.correlationId),
      recoveryHint: normalizeRecoveryHint(input.recoveryHint),
      attributes: sanitizeDiagnosticAttributes(input.attributes, input.source),
    };
  }

  const maskedSummary = maskDiagnosticText(input.summary, { privacyMode: true });
  const attributes = sanitizeDiagnosticAttributes(input.attributes, input.source);
  const changed =
    maskedSummary !== input.summary ||
    Object.keys(attributes).length !== Object.keys(input.attributes ?? {}).length;
  const unsafeAfterMask = containsSensitiveDiagnosticText(maskedSummary);
  const privacy: DiagnosticEventPrivacy = unsafeAfterMask
    ? "blocked"
    : input.privacy ?? (changed ? "redacted" : "safe");

  return {
    id,
    timestamp,
    source: input.source,
    level: input.level,
    privacy,
    category: input.category,
    summary: unsafeAfterMask ? "[blocked diagnostic event]" : maskedSummary,
    correlationId: sanitizeCorrelationId(input.correlationId),
    recoveryHint: normalizeRecoveryHint(input.recoveryHint),
    attributes,
  };
}

export function createHttpDiagnosticEvent(
  input: CreateHttpDiagnosticEventInput,
  options: DiagnosticEventFactoryOptions = {},
): DiagnosticEvent {
  const method = (input.method ?? "GET").toUpperCase();
  const endpointFamily = input.endpointFamily ?? deriveEndpointFamily(input.url);
  const status = input.status ?? null;

  if (input.errorKind === "abort") {
    return createDiagnosticEvent(
      {
        source: "http",
        level: "warn",
        category: "http.abort",
        summary: `${method} ${endpointFamily} was cancelled`,
        correlationId: input.correlationId,
        recoveryHint: input.recoveryHint,
        attributes: {
          endpointFamily,
          method,
          status,
          durationMs: input.durationMs,
          errorKind: "abort",
          retryable: false,
        },
      },
      options,
    );
  }

  if (input.errorKind === "timeout") {
    return createDiagnosticEvent(
      {
        source: "http",
        level: "warn",
        category: "http.timeout",
        summary: `${method} ${endpointFamily} timed out`,
        correlationId: input.correlationId,
        recoveryHint: input.recoveryHint,
        attributes: {
          endpointFamily,
          method,
          status,
          durationMs: input.durationMs,
          errorKind: "timeout",
          retryable: true,
        },
      },
      options,
    );
  }

  if (input.errorKind === "network") {
    return createDiagnosticEvent(
      {
        source: "http",
        level: "error",
        category: "http.network",
        summary: `${method} ${endpointFamily} failed with a network error`,
        correlationId: input.correlationId,
        recoveryHint: input.recoveryHint,
        attributes: {
          endpointFamily,
          method,
          status,
          durationMs: input.durationMs,
          errorKind: "network",
          retryable: input.retryable ?? true,
        },
      },
      options,
    );
  }

  if (typeof status === "number" && status >= 400) {
    return createDiagnosticEvent(
      {
        source: "http",
        level: "warn",
        category: "http.error",
        summary: `${method} ${endpointFamily} failed with HTTP ${status}`,
        correlationId: input.correlationId,
        recoveryHint: input.recoveryHint,
        attributes: {
          endpointFamily,
          method,
          status,
          durationMs: input.durationMs,
          errorKind: input.errorKind ?? "http-status",
          retryable: input.retryable ?? status >= 500,
        },
      },
      options,
    );
  }

  return createDiagnosticEvent(
    {
      source: "http",
      level: "info",
      category: "http.request",
      summary: `${method} ${endpointFamily} completed with HTTP ${status ?? "unknown"}`,
      correlationId: input.correlationId,
      recoveryHint: input.recoveryHint,
      attributes: {
        endpointFamily,
        method,
        status,
        durationMs: input.durationMs,
      },
    },
    options,
  );
}

export function sanitizeDiagnosticAttributes(
  attributes: Record<string, unknown> | undefined,
  source?: DiagnosticEventSource,
): DiagnosticEventAttributes {
  if (!attributes) return {};

  return Object.entries(attributes).reduce<DiagnosticEventAttributes>(
    (safeAttributes, [key, value]) => {
      if (!SAFE_ATTRIBUTE_KEYS.has(key) && !(source === "ux" && UX_SAFE_ATTRIBUTE_KEYS.has(key))) {
        return safeAttributes;
      }
      if (!isDiagnosticAttributeValue(value)) return safeAttributes;

      if (typeof value === "string") {
        const masked = maskDiagnosticText(value, { privacyMode: true });
        if (containsSensitiveDiagnosticText(masked)) return safeAttributes;
        safeAttributes[key] = masked;
        return safeAttributes;
      }

      safeAttributes[key] = value;
      return safeAttributes;
    },
    {},
  );
}

export function serializeDiagnosticEvents(events: DiagnosticEvent[]): string {
  return events
    .map((event) => {
      const summary =
        event.privacy === "blocked" ? "[blocked diagnostic event]" : event.summary;
      return `${event.timestamp} ${event.source}/${event.level} ${event.category}: ${summary}`;
    })
    .join("\n");
}

export function limitDiagnosticEvents(
  events: DiagnosticEvent[],
  maxItems: number,
): DiagnosticEvent[] {
  if (maxItems <= 0) return [];
  if (events.length <= maxItems) return events;
  return events.slice(events.length - maxItems);
}

function isDiagnosticAttributeValue(
  value: unknown,
): value is DiagnosticEventAttributeValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function sanitizeCorrelationId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^[A-Za-z0-9._:-]{1,80}$/.test(value) ? value : undefined;
}

function normalizeRecoveryHint(
  value: DiagnosticRecoveryHint | undefined,
): DiagnosticRecoveryHint | undefined {
  if (value === undefined) return undefined;
  return RECOVERY_HINTS.has(value) ? value : "none";
}

function deriveEndpointFamily(rawUrl: string | undefined): string {
  if (!rawUrl) return "unknown";

  try {
    const url = new URL(rawUrl);
    const path = url.pathname;
    const segments = path.split("/").filter(Boolean);

    if (segments[0] === "api" && segments[1] === "v1" && segments[2]) {
      return segments[2];
    }

    return segments[0] ?? "unknown";
  } catch {
    return "unknown";
  }
}
