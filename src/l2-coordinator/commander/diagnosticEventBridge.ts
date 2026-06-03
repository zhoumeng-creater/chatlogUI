import {
  createDiagnosticEvent,
  type CreateDiagnosticEventInput,
  type DiagnosticEvent,
  type DiagnosticEventLevel,
  type DiagnosticEventSource,
  type DiagnosticRecoveryHint,
} from "@l4/network/diagnosticEvents";
import type { RequestDiagnosticsOptions } from "@l4/network/httpClient";
import { useDiagnosticEventStore } from "@/l2-coordinator/data-clerk/stores/useDiagnosticEventStore";

interface DiagnosticHttpOptionsInput {
  endpointFamily: string;
  method?: string;
  correlationId?: string;
  recoveryHint?: DiagnosticRecoveryHint;
}

interface DiagnosticEventSinkDefaults {
  source: DiagnosticEventSource;
  category: string;
  level?: DiagnosticEventLevel;
  correlationId?: string;
  recoveryHint?: DiagnosticRecoveryHint;
}

type DiagnosticEventSinkInput = Pick<CreateDiagnosticEventInput, "summary"> &
  Partial<Pick<CreateDiagnosticEventInput, "level" | "privacy" | "attributes">> & {
  category?: string;
  correlationId?: string;
  recoveryHint?: DiagnosticRecoveryHint;
};

export function createDiagnosticHttpOptions(
  input: DiagnosticHttpOptionsInput,
): RequestDiagnosticsOptions {
  return {
    diagnostics: {
      endpointFamily: input.endpointFamily,
      method: input.method,
      correlationId: input.correlationId,
      recoveryHint: input.recoveryHint,
    },
    onDiagnosticEvent: recordDiagnosticEvent,
  };
}

export function createDiagnosticEventSink(defaults: DiagnosticEventSinkDefaults) {
  return (input: DiagnosticEventSinkInput): DiagnosticEvent =>
    recordLocalDiagnosticEvent({
      source: defaults.source,
      level: input.level ?? defaults.level ?? "info",
      category: input.category ?? defaults.category,
      summary: input.summary,
      privacy: input.privacy,
      correlationId: input.correlationId ?? defaults.correlationId,
      recoveryHint: input.recoveryHint ?? defaults.recoveryHint,
      attributes: input.attributes,
    });
}

export function recordLocalDiagnosticEvent(
  input: CreateDiagnosticEventInput,
): DiagnosticEvent {
  const event = createDiagnosticEvent(input);
  recordDiagnosticEvent(event);
  return event;
}

export function recordDiagnosticEvent(event: DiagnosticEvent): void {
  useDiagnosticEventStore.getState().addEvent(event);
}
