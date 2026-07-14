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
  let closed = false;
  let cancelPromise: Promise<void> | null = null;

  return {
    status: "opened",
    stream: {
      fileName: opened.fileName,
      extension: opened.extension,
      append: async (chunk) => {
        if (closed) throw new Error("导出任务已结束，请重新开始。");
        return invoke<AppendBusinessExportStreamResponse>("append_business_export_stream", {
          sessionId: opened.sessionId,
          chunk,
        });
      },
      complete: async () => {
        if (closed) throw new Error("导出任务已结束，请重新开始。");
        const response = await invoke<ExportBusinessFileResponse>(
          "complete_business_export_stream",
          { sessionId: opened.sessionId },
        );
        closed = true;
        return {
          ...response,
          locationSummary: formatBusinessExportLocationSummary(response),
        };
      },
      cancel: async () => {
        if (closed) return;
        if (!cancelPromise) {
          cancelPromise = invoke<void>("cancel_business_export_stream", {
            sessionId: opened.sessionId,
          })
            .then(() => {
              closed = true;
            })
            .catch((error: unknown) => {
              cancelPromise = null;
              throw error;
            });
        }
        return cancelPromise;
      },
    },
  };
}

async function selectBusinessExportPath(
  request: Pick<ExportBusinessFileRequest, "fileName" | "extension">,
): Promise<string | null> {
  return save({
    defaultPath: request.fileName,
    filters: [{ name: FILTER_LABELS[request.extension], extensions: [request.extension] }],
  });
}
