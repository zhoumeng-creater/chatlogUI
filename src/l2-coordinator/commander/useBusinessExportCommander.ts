import { useCallback, useState } from "react";
import { exportBusinessFile } from "@/l4-atom/system";
import { containsUnsafeDisplayText } from "@/utils/privacyDisplay";
import { useExportStore, useSettingsStore } from "@/l2-coordinator/data-clerk/stores";
import type {
  BusinessExportArtifact,
  BusinessExportError,
  BusinessExportFormat,
  BusinessExportSourceModule,
} from "./businessExportModel";
import { validateBusinessExportArtifact } from "./businessExportModel";
import {
  createUxKpiTimer,
  recordErrorRecoveryKpiEvent,
  recordExportKpiEvent,
} from "./uxKpiEvents";

interface BusinessExportBuildInput {
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted: boolean;
  unredactedConfirmed: boolean;
  generatedAt: Date;
}

interface BusinessExportCommanderOptions {
  source: BusinessExportSourceModule;
  formats: BusinessExportFormat[];
  defaultFormat: BusinessExportFormat;
  disabledReason: string | null;
  buildArtifact: (input: BusinessExportBuildInput) => BusinessExportArtifact;
}

export interface BusinessExportActionView {
  label: string;
  disabled: boolean;
  disabledReason: string | null;
  onClick: () => void;
}

export interface BusinessExportDialogView {
  artifact: BusinessExportArtifact | null;
  job: BusinessExportArtifact["job"] | null;
  formats: BusinessExportFormat[];
  selectedFormat: BusinessExportFormat;
  privacyOn: boolean;
  unredactedConfirmed: boolean;
  resultSummary: ReturnType<typeof useExportStore.getState>["safeResultSummary"];
  stopWaitingMessage: ReturnType<typeof useExportStore.getState>["stopWaitingMessage"];
  onFormatChange: (format: BusinessExportFormat) => void;
  onToggleUnredacted: (confirmed: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
  onRetry: () => void;
}

export interface BusinessExportCommander {
  action: BusinessExportActionView;
  dialog: BusinessExportDialogView;
  isOpen: boolean;
}

export function useBusinessExportCommander({
  source,
  formats,
  defaultFormat,
  disabledReason,
  buildArtifact,
}: BusinessExportCommanderOptions): BusinessExportCommander {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const {
    currentJob,
    transientArtifact,
    safeResultSummary,
    stopWaitingMessage,
    beginExport,
    startWriting,
    completeExport,
    failExport,
    cancelExport,
    resetExport,
  } = useExportStore();
  const [selectedFormat, setSelectedFormat] = useState<BusinessExportFormat>(defaultFormat);
  const [unredactedConfirmed, setUnredactedConfirmed] = useState(false);
  const currentMatchesSource = currentJob?.source === source;
  const isOpen = currentMatchesSource && Boolean(currentJob);
  const isBusy = currentJob?.status === "writing" || currentJob?.status === "preparing";
  const activeArtifact = currentMatchesSource ? transientArtifact : null;
  const activeJob = currentMatchesSource ? currentJob : null;

  const createArtifact = useCallback((format = selectedFormat, confirmed = unredactedConfirmed) =>
    buildArtifact({
      format,
      privacyOn: privacyOn || !confirmed,
      requestedUnredacted: confirmed && !privacyOn,
      unredactedConfirmed: confirmed && !privacyOn,
      generatedAt: new Date(),
    }), [buildArtifact, privacyOn, selectedFormat, unredactedConfirmed]);

  const openExport = useCallback(() => {
    if (disabledReason) return;
    const artifact = createArtifact(defaultFormat, false);
    setSelectedFormat(defaultFormat);
    setUnredactedConfirmed(false);
    beginExport(artifact.job, artifact);
  }, [beginExport, createArtifact, defaultFormat, disabledReason]);

  const changeFormat = useCallback((format: BusinessExportFormat) => {
    setSelectedFormat(format);
    if (!activeJob || activeJob.status === "writing" || activeJob.status === "completed") return;
    const artifact = createArtifact(format, unredactedConfirmed);
    beginExport(artifact.job, artifact);
  }, [activeJob, beginExport, createArtifact, unredactedConfirmed]);

  const toggleUnredacted = useCallback((confirmed: boolean) => {
    setUnredactedConfirmed(confirmed);
    if (!activeJob || activeJob.status === "writing" || activeJob.status === "completed") return;
    const artifact = createArtifact(selectedFormat, confirmed);
    beginExport(artifact.job, artifact);
  }, [activeJob, beginExport, createArtifact, selectedFormat]);

  const writeArtifact = useCallback(async (artifact: BusinessExportArtifact) => {
    const timer = createUxKpiTimer();
    const validation = validateBusinessExportArtifact(artifact);
    if (!validation.ok) {
      const exportError = validation.error ?? {
        category: "redaction-blocked",
        message: "导出内容未通过隐私校验，已阻止写入。",
        retryable: true,
      };
      failExport(artifact.job.id, exportError);
      recordExportKpiEvent({
        sourceModule: artifact.source,
        format: artifact.format,
        rowCount: artifact.rowCount,
        redactionPolicy: artifact.redactionPolicy,
        durationMs: timer.durationMs(),
        outcome: "failed",
        errorKind: exportError.category,
      });
      return;
    }

    startWriting(artifact.job.id);
    try {
      const result = await exportBusinessFile({
        fileName: artifact.fileName,
        extension: artifact.extension,
        content: artifact.content,
        redactionPolicy: artifact.redactionPolicy === "unredacted-confirmed"
          ? "unredacted-confirmed"
          : "redacted",
      });
      if (result.status === "cancelled") {
        cancelExport(artifact.job.id);
        recordExportKpiEvent({
          sourceModule: artifact.source,
          format: artifact.format,
          rowCount: artifact.rowCount,
          redactionPolicy: artifact.redactionPolicy,
          durationMs: timer.durationMs(),
          outcome: "cancelled",
          cancelKind: "user",
        });
        return;
      }
      completeExport(artifact.job.id, result.summary);
      recordExportKpiEvent({
        sourceModule: artifact.source,
        format: artifact.format,
        rowCount: artifact.rowCount,
        redactionPolicy: artifact.redactionPolicy,
        durationMs: timer.durationMs(),
        outcome: "success",
      });
    } catch (error) {
      const exportError = translateExportError(error);
      failExport(artifact.job.id, exportError);
      recordExportKpiEvent({
        sourceModule: artifact.source,
        format: artifact.format,
        rowCount: artifact.rowCount,
        redactionPolicy: artifact.redactionPolicy,
        durationMs: timer.durationMs(),
        outcome: "failed",
        errorKind: exportError.category,
      });
    }
  }, [cancelExport, completeExport, failExport, startWriting]);

  const confirm = useCallback(() => {
    const artifact = activeArtifact ?? createArtifact();
    void writeArtifact(artifact);
  }, [activeArtifact, createArtifact, writeArtifact]);

  const cancel = useCallback(() => {
    if (activeJob) {
      cancelExport(activeJob.id);
      return;
    }
    resetExport();
  }, [activeJob, cancelExport, resetExport]);

  const close = useCallback(() => {
    if (activeJob?.status === "writing") {
      cancelExport(activeJob.id);
      return;
    }
    resetExport();
  }, [activeJob, cancelExport, resetExport]);

  const retry = useCallback(() => {
    recordErrorRecoveryKpiEvent({
      sourceModule: source,
      recoveryAction: "retry",
      outcome: "success",
    });
    const artifact = createArtifact();
    beginExport(artifact.job, artifact);
    void writeArtifact(artifact);
  }, [beginExport, createArtifact, source, writeArtifact]);

  return {
    action: {
      label: "导出",
      disabled: Boolean(disabledReason) || isBusy,
      disabledReason: isBusy ? "导出正在进行，请等待当前任务结束。" : disabledReason,
      onClick: openExport,
    },
    dialog: {
      artifact: activeArtifact,
      job: activeJob,
      formats,
      selectedFormat,
      privacyOn,
      unredactedConfirmed,
      resultSummary: currentMatchesSource ? safeResultSummary : null,
      stopWaitingMessage: currentMatchesSource ? stopWaitingMessage : null,
      onFormatChange: changeFormat,
      onToggleUnredacted: toggleUnredacted,
      onConfirm: confirm,
      onCancel: cancel,
      onClose: close,
      onRetry: retry,
    },
    isOpen,
  };
}

function translateExportError(error: unknown): BusinessExportError {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const message = containsUnsafeDisplayText(rawMessage)
    ? "保存失败，请换一个位置后重试。"
    : rawMessage.trim() || "保存失败，请换一个位置后重试。";
  const lower = rawMessage.toLowerCase();

  if (/permission|denied|access|权限|拒绝/.test(lower)) {
    return { category: "permission-denied", message, retryable: true };
  }
  if (/path|位置|文件名|extension|格式|目录/.test(lower)) {
    return { category: "path-invalid", message, retryable: true };
  }
  if (/disk|space|磁盘|空间/.test(lower)) {
    return { category: "disk-full", message, retryable: true };
  }
  if (/隐私|脱敏|密钥|路径|阻止写入|redaction/.test(lower)) {
    return { category: "redaction-blocked", message, retryable: true };
  }
  return { category: "write-failed", message, retryable: true };
}
