import { useDiagnosticEventStore } from "@l2/data-clerk/stores/useDiagnosticEventStore";
import {
  createDiagnosticEvent,
  type CreateDiagnosticEventInput,
  type DiagnosticEvent,
  type DiagnosticEventLevel,
  type DiagnosticRecoveryHint,
} from "@l4/network/diagnosticEvents";
import type { RequestDiagnosticsOptions } from "@l4/network/httpClient";

export interface DiagnosticHttpBridgeOptions {
  endpointFamily: string;
  method?: string;
  correlationId?: string;
  recoveryHint?: DiagnosticRecoveryHint;
}

export interface ReleaseDiagnosticEventInput {
  level: DiagnosticEventLevel;
  category: string;
  summary: string;
  releaseGate: string;
  recoveryHint?: DiagnosticRecoveryHint;
}

export function recordDiagnosticEvent(event: DiagnosticEvent): DiagnosticEvent {
  useDiagnosticEventStore.getState().addEvent(event);
  return event;
}

export function recordLocalDiagnosticEvent(
  input: CreateDiagnosticEventInput,
): DiagnosticEvent {
  return recordDiagnosticEvent(createDiagnosticEvent(input));
}

export function createDiagnosticHttpOptions(
  options: DiagnosticHttpBridgeOptions,
): RequestDiagnosticsOptions {
  return {
    diagnostics: options,
    onDiagnosticEvent: recordDiagnosticEvent,
  };
}

export function recordReleaseDiagnosticEvent(
  input: ReleaseDiagnosticEventInput,
): DiagnosticEvent {
  return recordLocalDiagnosticEvent({
    source: "release",
    level: input.level,
    category: input.category,
    summary: input.summary,
    recoveryHint: input.recoveryHint,
    attributes: {
      releaseGate: input.releaseGate,
    },
  });
}
