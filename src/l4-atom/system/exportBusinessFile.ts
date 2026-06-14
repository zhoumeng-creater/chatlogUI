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
