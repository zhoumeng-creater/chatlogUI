import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { formatBusinessExportLocationSummary } from "@/utils/privacyDisplay";

export type ExportBusinessFileExtension = "md" | "csv" | "json";
export type ExportBusinessFileRedactionPolicy = "redacted" | "unredacted-confirmed";

export interface ExportBusinessFileRequest {
  fileName: string;
  extension: ExportBusinessFileExtension;
  content: string;
  redactionPolicy: ExportBusinessFileRedactionPolicy;
}

export type BeginBusinessExportStreamRequest = Omit<ExportBusinessFileRequest, "content">;

interface ExportBusinessFilePayload {
  path: string;
  content: string;
  expectedExtension: ExportBusinessFileExtension;
  redactionPolicy: ExportBusinessFileRedactionPolicy;
}

interface ExportBusinessFileResponse {
  fileName: string;
  extension: ExportBusinessFileExtension;
  bytesWritten: number;
}

interface BeginBusinessExportStreamResponse {
  sessionId: string;
  fileName: string;
  extension: ExportBusinessFileExtension;
}

interface AppendBusinessExportStreamResponse {
  bytesWritten: number;
}

export interface ExportBusinessFileCompleted {
  status: "completed";
  summary: ExportBusinessFileResponse & {
    locationSummary: string;
  };
}

export interface ExportBusinessFileCancelled {
  status: "cancelled";
}

export type ExportBusinessFileResult = ExportBusinessFileCompleted | ExportBusinessFileCancelled;

export interface BusinessExportStream {
  readonly fileName: string;
  readonly extension: ExportBusinessFileExtension;
  append: (chunk: string) => Promise<AppendBusinessExportStreamResponse>;
  complete: () => Promise<ExportBusinessFileCompleted["summary"]>;
  commit: () => Promise<void>;
  cancel: () => Promise<void>;
}

export type BeginBusinessExportStreamResult =
  | { status: "cancelled" }
  | { status: "opened"; stream: BusinessExportStream };

const FILTER_LABELS: Record<ExportBusinessFileExtension, string> = {
  md: "Markdown",
  csv: "CSV",
  json: "JSON",
};

export async function exportBusinessFile(
  request: ExportBusinessFileRequest,
): Promise<ExportBusinessFileResult> {
  const selectedPath = await save({
    defaultPath: request.fileName,
    filters: [{ name: FILTER_LABELS[request.extension], extensions: [request.extension] }],
  });

  if (!selectedPath) return { status: "cancelled" };

  const payload: ExportBusinessFilePayload = {
    path: selectedPath,
    content: request.content,
    expectedExtension: request.extension,
    redactionPolicy: request.redactionPolicy,
  };
  const response = await invoke<ExportBusinessFileResponse>("export_business_file", { payload });

  return {
    status: "completed",
    summary: {
      ...response,
      locationSummary: formatBusinessExportLocationSummary(response),
    },
  };
}

export async function beginBusinessExportStream(
  request: BeginBusinessExportStreamRequest,
): Promise<BeginBusinessExportStreamResult> {
  const selectedPath = await selectBusinessExportPath(request);
  if (!selectedPath) return { status: "cancelled" };

  const opened = await invoke<BeginBusinessExportStreamResponse>("begin_business_export_stream", {
    payload: {
      path: selectedPath,
      expectedExtension: request.extension,
      redactionPolicy: request.redactionPolicy,
    },
  });
  let lifecycle:
    | "open"
    | "completing"
    | "published"
    | "committed"
    | "cancelled"
    | "cleanup-required" = "open";
  let terminalOperation: "commit" | "cancel" | null = null;
  let terminalPromise: Promise<void> | null = null;
  let completePromise: Promise<ExportBusinessFileCompleted["summary"]> | null = null;

  return {
    status: "opened",
    stream: {
      fileName: opened.fileName,
      extension: opened.extension,
      append: async (chunk) => {
        if (lifecycle !== "open") throw new Error("导出任务已结束，请重新开始。");
        return invoke<AppendBusinessExportStreamResponse>("append_business_export_stream", {
          sessionId: opened.sessionId,
          chunk,
        });
      },
      complete: async () => {
        if (lifecycle === "cancelled" || lifecycle === "cleanup-required") {
          throw new Error("导出已取消或正在安全清理，请重新开始。");
        }
        if (terminalOperation === "cancel") throw new Error("导出正在取消，请稍后重试。");
        if (completePromise) return completePromise;
        if (lifecycle !== "open") throw new Error("导出任务已结束，请重新开始。");
        lifecycle = "completing";
        const operation = invoke<ExportBusinessFileResponse>(
          "complete_business_export_stream",
          { sessionId: opened.sessionId },
        )
          .then((response) => {
            if (
              terminalOperation === "cancel" ||
              lifecycle === "cancelled" ||
              lifecycle === "cleanup-required"
            ) {
              throw new Error("导出已取消或正在安全清理，请重新开始。");
            }
            lifecycle = "published";
            return {
              ...response,
              locationSummary: formatBusinessExportLocationSummary(response),
            };
          })
          .catch((error: unknown) => {
            if (terminalOperation !== "cancel" && lifecycle !== "cancelled") {
              lifecycle = "cleanup-required";
            }
            throw error;
          });
        completePromise = operation;
        return operation;
      },
      commit: async () => {
        if (lifecycle === "committed") return;
        if (lifecycle === "cancelled") throw new Error("导出已取消，请重新开始。");
        if (lifecycle !== "published") throw new Error("导出任务尚未完成，请稍后重试。");
        if (terminalOperation === "cancel") throw new Error("导出正在取消，无法提交。");
        if (!terminalPromise) {
          terminalOperation = "commit";
          const operation = Promise.resolve()
            .then(() => commitWithAcknowledgementReconcile(opened.sessionId))
            .then(() => {
              lifecycle = "committed";
            })
            .catch((error: unknown) => {
              terminalOperation = null;
              terminalPromise = null;
              throw error;
            });
          terminalPromise = operation;
        }
        return terminalPromise;
      },
      cancel: async () => {
        if (lifecycle === "cancelled") return;
        if (lifecycle === "committed") throw new Error("导出已提交，无法取消。");
        if (terminalOperation === "commit") throw new Error("导出正在提交，无法取消。");
        if (!terminalPromise) {
          terminalOperation = "cancel";
          const operation = Promise.resolve()
            .then(() =>
              invoke<void>("cancel_business_export_stream", {
                sessionId: opened.sessionId,
              }),
            )
            .then(() => {
              lifecycle = "cancelled";
            })
            .catch((error: unknown) => {
              lifecycle = "cleanup-required";
              terminalOperation = null;
              terminalPromise = null;
              throw error;
            });
          terminalPromise = operation;
        }
        return terminalPromise;
      },
    },
  };
}

async function commitWithAcknowledgementReconcile(sessionId: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await invoke<void>("commit_business_export_stream", { sessionId });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function selectBusinessExportPath(
  request: Pick<ExportBusinessFileRequest, "fileName" | "extension">,
): Promise<string | null> {
  return save({
    defaultPath: request.fileName,
    filters: [{ name: FILTER_LABELS[request.extension], extensions: [request.extension] }],
  });
}
