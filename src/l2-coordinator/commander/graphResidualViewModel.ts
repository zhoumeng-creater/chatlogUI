import type {
  GraphBusinessDraft,
  GraphConfigDraft,
  GraphConfigView,
  GraphEventDraft,
  GraphIngestResult,
  GraphQADraft,
  GraphQAResponseView,
} from "@l4/network";
import type { GraphAdvancedConfirmation } from "@l2/data-clerk/stores/useGraphStore";

export type { GraphBusinessDraft, GraphConfigDraft, GraphEventDraft, GraphQADraft };

export type GraphResidualLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface GraphResidualViewInput {
  configStatus: GraphResidualLoadStatus;
  ingestStatus: GraphResidualLoadStatus;
  qaStatus: GraphResidualLoadStatus;
  config: GraphConfigView | null;
  ingestResult: GraphIngestResult | null;
  qaResult: GraphQAResponseView | null;
  confirmationPending: GraphAdvancedConfirmation | null;
  configError: string | null;
  ingestError: string | null;
  qaError: string | null;
}

export interface GraphResidualView {
  configStatus: GraphResidualLoadStatus;
  ingestStatus: GraphResidualLoadStatus;
  qaStatus: GraphResidualLoadStatus;
  configSummary: string;
  ingestSummary: string;
  qaSummary: string;
  businessIngestCopy: string;
  eventIngestCopy: string;
  qaCopy: string;
  resetRebuildCopy: string;
  confirmationCopy: string | null;
  errorCopy: string | null;
}

export function buildGraphResidualView(
  input: GraphResidualViewInput,
  privacyOn: boolean,
): GraphResidualView {
  return {
    configStatus: input.configStatus,
    ingestStatus: input.ingestStatus,
    qaStatus: input.qaStatus,
    configSummary: input.config
      ? `${input.config.workers} 图谱线程 · ${input.config.enqueueWorkers} 入队线程`
      : "图谱配置未加载",
    ingestSummary: input.ingestResult
      ? `${input.ingestResult.count} item${input.ingestResult.count === 1 ? "" : "s"} · ${input.ingestResult.statusLabel}`
      : "尚未执行图谱 ingest",
    qaSummary: input.qaResult
      ? `${qaAnswerSummary(input.qaResult, privacyOn)} · ${input.qaResult.evidenceSummary}`
      : "尚未执行图谱 QA",
    businessIngestCopy: input.confirmationPending === "business" ? "确认写入业务记录" : "写入业务记录",
    eventIngestCopy: input.confirmationPending === "event" ? "确认写入事件" : "写入事件",
    qaCopy: input.confirmationPending === "qa" ? "确认提问" : "提问",
    resetRebuildCopy: input.confirmationPending === "reset" ? "确认重置重建" : "重置重建",
    confirmationCopy: confirmationCopy(input.confirmationPending),
    errorCopy: input.configError ?? input.ingestError ?? input.qaError,
  };
}

export function hasMeaningfulGraphBusinessDraft(draft: GraphBusinessDraft): boolean {
  return [
    draft.source,
    draft.time,
    draft.title,
    draft.content,
    draft.entities,
  ].some(hasText);
}

export function hasMeaningfulGraphEventDraft(draft: GraphEventDraft): boolean {
  return [
    draft.time,
    draft.actors,
    draft.targets,
    draft.content,
  ].some(hasText);
}

function confirmationCopy(action: GraphAdvancedConfirmation | null): string | null {
  if (!action) return null;
  const label =
    action === "business"
      ? "业务记录写入"
      : action === "event"
        ? "事件写入"
        : action === "reset"
          ? "图谱清空并重建"
          : "图谱 QA";
  if (action === "reset") {
    return `${label} 会调用本地图谱接口清空并重建索引；再次点击确认，或取消。`;
  }
  return `${label} 会调用本地图谱接口并可能写入索引；再次点击确认，或取消。`;
}

function qaAnswerSummary(result: GraphQAResponseView, privacyOn: boolean): string {
  if (!result.hasAnswer) return "无回答";
  if (privacyOn) return "已隐藏回答";
  return result.answerPreview || "无回答";
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
