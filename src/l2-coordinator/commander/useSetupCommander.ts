import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import type {
  SetupMode,
  SetupPathId,
  ConfigSource,
  SetupProfileSummary,
} from "@l2/data-clerk/types/setup";
import {
  importDataDirConfig,
  clearExternalConnectionConfig,
  loadExternalConnectionConfigSummary,
  saveManagedServerConfig,
  saveExternalConnectionConfig,
  loadManagedServerConfigSummary,
  validateManagedServerConfig,
  type ServerConfigDraft,
} from "@l4/system/chatlogConfig";
import { detectWxPath, type WxPathCandidate } from "@l4/system/detectWxPath";
import {
  inspectPort,
  startManagedSidecar,
  stopManagedSidecar,
  toPortState,
} from "@l4/system/sidecarManager";
import { openDirectoryPicker } from "@l4/system/openDirectoryPicker";
import {
  fetchHealth,
  fetchDbReadiness,
  formatReadinessFailureMessage,
} from "@l4/network/readiness";
import { validateChatlogServiceBaseUrl } from "@l4/network/chatlogEndpoint";
import { formatSafeUserFacingError } from "@/utils/privacyDisplay";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { deriveSetupStep } from "./setupMachine";
import {
  resolveSetupPortInspectionPort,
  resolveSetupReadinessBaseUrl,
} from "./setupServiceTarget";
import {
  deriveManualConfigValidationView,
  mapConfigValidationErrorsToManualFields,
} from "./setupManualValidation";
import { settingsMessagesZhCN } from "./messages.zh-CN";
import {
  createUxKpiTimer,
  recordSetupCompletedKpiEvent,
} from "./uxKpiEvents";

function isProfileConfigValid(profile: ReturnType<typeof useSetupStore.getState>["profile"]): boolean {
  if (profile?.mode === "external" || profile?.source === "external-service") {
    return Boolean(profile.httpAddr && profile.port);
  }

  return Boolean(
    profile?.dataDir &&
    profile.hasDataKey &&
    profile.platform &&
    profile.version &&
    profile.fullVersion,
  );
}

function derivePathFromProfile(profile: SetupProfileSummary | null): SetupPathId {
  if (profile?.mode === "external" || profile?.source === "external-service") {
    return "external-service";
  }
  if (profile?.source === "manual-advanced") {
    return "manual-advanced";
  }
  return "recommended-import";
}

export interface SetupCommander {
  loadExistingProfile: () => Promise<void>;
  chooseMode: (mode: SetupMode) => void;
  chooseSetupPath: (path: SetupPathId) => void;
  importDataDirectory: (path: string) => Promise<void>;
  chooseAndImportDataDirectory: () => Promise<string | null>;
  detectDataDirectories: () => Promise<void>;
  importDetectedDataDirectory: (candidateId: string) => Promise<void>;
  chooseManualDataDirectory: () => Promise<string | null>;
  chooseManualWorkDirectory: () => Promise<string | null>;
  saveManualConfig: (draft: ServerConfigDraft) => Promise<void>;
  inspectServicePort: () => Promise<void>;
  startManagedService: () => Promise<void>;
  connectExternalService: (baseUrl: string) => Promise<void>;
  checkReadiness: () => Promise<void>;
  stopManagedService: () => Promise<void>;
  openWorkbench: () => void;
}

export function useSetupCommander(): SetupCommander {
  const navigate = useNavigate();
  const setupKpiCompletionKeyRef = useRef<string | null>(null);
  const setMode = useSetupStore((s) => s.setMode);
  const setActivePath = useSetupStore((s) => s.setActivePath);
  const setCurrentStep = useSetupStore((s) => s.setCurrentStep);
  const setProfile = useSetupStore((s) => s.setProfile);
  const setPortState = useSetupStore((s) => s.setPortState);
  const setReadiness = useSetupStore((s) => s.setReadiness);
  const setExternalBaseUrlDraft = useSetupStore((s) => s.setExternalBaseUrlDraft);
  const setExternalBaseUrlError = useSetupStore((s) => s.setExternalBaseUrlError);
  const setManualFieldErrors = useSetupStore((s) => s.setManualFieldErrors);
  const setManualDraft = useSetupStore((s) => s.setManualDraft);
  const setDetectedPathState = useSetupStore((s) => s.setDetectedPathState);
  const setLoading = useSetupStore((s) => s.setLoading);
  const setError = useSetupStore((s) => s.setError);

  const syncStep = useCallback(() => {
    const state = useSetupStore.getState();
    const snapshot = {
      mode: state.mode,
      source: (state.profile?.source ?? "none") as ConfigSource,
      profileComplete: state.profile !== null,
      configValid: isProfileConfigValid(state.profile),
      portState: state.portState,
      httpReady: state.httpReady,
      dbReady: state.dbReady,
    };
    setCurrentStep(deriveSetupStep(snapshot));
  }, [setCurrentStep]);

  const recordSetupCompletedIfReady = useCallback((durationMs: number) => {
    const state = useSetupStore.getState();
    if (!isProfileConfigValid(state.profile) || !state.httpReady || !state.dbReady) {
      return;
    }

    const mode = state.mode === "external" || state.profile?.mode === "external"
      ? "external"
      : state.mode === "managed" || state.profile?.mode === "managed"
        ? "managed"
        : "unknown";
    const key = `${mode}:${state.profile?.source ?? "unknown"}:${state.profile?.httpAddr ?? "unknown"}`;
    if (setupKpiCompletionKeyRef.current === key) return;

    setupKpiCompletionKeyRef.current = key;
    recordSetupCompletedKpiEvent({
      mode,
      httpReady: state.httpReady,
      dbReady: state.dbReady,
      durationMs,
      outcome: "success",
    });
  }, []);

  const loadExistingProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await loadExternalConnectionConfigSummary()
        ?? await loadManagedServerConfigSummary();
      if (summary) {
        setProfile(summary);
        setMode(summary.mode);
        setActivePath(derivePathFromProfile(summary));
        setExternalBaseUrlDraft(summary.httpAddr);
        if (summary.mode === "external") {
          setPortState("external-chatlog");
        }
        syncStep();
      }
    } catch {
      // no existing profile
    } finally {
      setLoading(false);
    }
  }, [setActivePath, setError, setExternalBaseUrlDraft, setLoading, setMode, setPortState, setProfile, syncStep]);

  const chooseMode = useCallback(
    (mode: SetupMode) => {
      setMode(mode);
      if (mode === "external") {
        setActivePath("external-service");
        const existingDraft = useSetupStore.getState().externalBaseUrlDraft
          || useSetupStore.getState().profile?.httpAddr
          || "http://127.0.0.1:5030";
        setExternalBaseUrlDraft(existingDraft);
        setExternalBaseUrlError(null);
        setReadiness({ httpReady: false, dbReady: false });
        if (useSetupStore.getState().profile?.mode !== "external") {
          setProfile(null);
        }
        setPortState("unknown");
        setCurrentStep("service");
      } else {
        setActivePath("recommended-import");
        if (useSetupStore.getState().profile?.mode === "external") {
          setProfile(null);
        }
        setExternalBaseUrlError(null);
        setManualFieldErrors({});
        setDetectedPathState({ detectedPathStatus: "idle", detectedPathError: null });
        setReadiness({ httpReady: false, dbReady: false });
        setCurrentStep("config");
      }
    },
    [
      setActivePath,
      setCurrentStep,
      setExternalBaseUrlDraft,
      setExternalBaseUrlError,
      setManualFieldErrors,
      setDetectedPathState,
      setMode,
      setPortState,
      setProfile,
      setReadiness,
    ],
  );

  const chooseSetupPath = useCallback(
    (path: SetupPathId) => {
      setActivePath(path);
      setError(null);
      setManualFieldErrors({});

      if (path === "external-service") {
        chooseMode("external");
        return;
      }

      setMode("managed");
      if (useSetupStore.getState().profile?.mode === "external") {
        setProfile(null);
      }
      setExternalBaseUrlError(null);
      if (path === "recommended-import") {
        setDetectedPathState({ detectedPathStatus: "idle", detectedPathError: null });
      }
      setReadiness({ httpReady: false, dbReady: false });
      setCurrentStep("config");
    },
    [
      chooseMode,
      setActivePath,
      setCurrentStep,
      setError,
      setExternalBaseUrlError,
      setManualFieldErrors,
      setDetectedPathState,
      setMode,
      setProfile,
      setReadiness,
    ],
  );

  const importDataDirectory = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);
      try {
        const summary = await importDataDirConfig(path);
        await clearExternalConnectionConfig();
        setProfile(summary);
        setMode(summary.mode);
        setActivePath("recommended-import");
        setManualFieldErrors({});
        setExternalBaseUrlDraft(summary.httpAddr);
        setReadiness({ httpReady: false, dbReady: false });
        syncStep();
      } catch (err) {
        setError(formatSafeUserFacingError(err));
      } finally {
        setLoading(false);
      }
    },
    [setActivePath, setError, setExternalBaseUrlDraft, setLoading, setManualFieldErrors, setMode, setProfile, setReadiness, syncStep],
  );

  const chooseAndImportDataDirectory = useCallback(async () => {
    const dir = await openDirectoryPicker();
    if (!dir) return null;
    await importDataDirectory(dir);
    return dir;
  }, [importDataDirectory]);

  const detectDataDirectories = useCallback(async () => {
    const state = useSetupStore.getState();
    if (state.profile || state.activePath !== "recommended-import") return;

    setDetectedPathState({
      detectedPathStatus: "loading",
      detectedPathError: null,
      detectedPathCandidates: [],
    });

    try {
      const candidates = normalizeDetectedCandidates(await detectWxPath());
      const latestState = useSetupStore.getState();
      if (latestState.profile || latestState.activePath !== "recommended-import") return;
      setDetectedPathState({
        detectedPathCandidates: candidates,
        detectedPathStatus: candidates.some((candidate) => candidate.exists) ? "success" : "empty",
        detectedPathError: null,
      });
    } catch (err) {
      const latestState = useSetupStore.getState();
      if (latestState.profile || latestState.activePath !== "recommended-import") return;
      setDetectedPathState({
        detectedPathCandidates: [],
        detectedPathStatus: "error",
        detectedPathError: formatSafeUserFacingError(err),
      });
    }
  }, [setDetectedPathState]);

  const importDetectedDataDirectory = useCallback(
    async (candidateId: string) => {
      const candidate = useSetupStore.getState().detectedPathCandidates
        .find((item) => item.id === candidateId);
      if (!candidate || !candidate.exists) {
        setError("该候选目录当前不可用，请选择其他目录。");
        return;
      }
      await importDataDirectory(candidate.path);
    },
    [importDataDirectory, setError],
  );

  const chooseManualDirectory = useCallback(
    async (field: "dataDir" | "workDir") => {
      const dir = await openDirectoryPicker();
      if (!dir) return null;
      setManualDraft({
        ...useSetupStore.getState().manualDraft,
        [field]: dir,
      });
      setError(null);
      return dir;
    },
    [setError, setManualDraft],
  );

  const chooseManualDataDirectory = useCallback(
    () => chooseManualDirectory("dataDir"),
    [chooseManualDirectory],
  );

  const chooseManualWorkDirectory = useCallback(
    () => chooseManualDirectory("workDir"),
    [chooseManualDirectory],
  );

  const saveManualConfig = useCallback(
    async (draft: ServerConfigDraft) => {
      setLoading(true);
      setError(null);
      setManualFieldErrors({});
      try {
        const localValidation = deriveManualConfigValidationView(draft);
        if (!localValidation.valid) {
          setManualFieldErrors(localValidation.fieldErrors);
          setError(localValidation.summary);
          return;
        }

        const errors = await validateManagedServerConfig(draft);
        if (errors.length > 0) {
          const validationView = mapConfigValidationErrorsToManualFields(errors);
          setManualFieldErrors(validationView.fieldErrors);
          setError(validationView.summary);
          return;
        }
        const summary = await saveManagedServerConfig(draft);
        await clearExternalConnectionConfig();
        setProfile(summary);
        setMode(summary.mode);
        setActivePath("manual-advanced");
        setManualFieldErrors({});
        setExternalBaseUrlDraft(summary.httpAddr);
        setReadiness({ httpReady: false, dbReady: false });
        syncStep();
      } catch (err) {
        setError(formatSafeUserFacingError(err));
      } finally {
        setLoading(false);
      }
    },
    [
      setActivePath,
      setError,
      setExternalBaseUrlDraft,
      setLoading,
      setManualFieldErrors,
      setMode,
      setProfile,
      setReadiness,
      syncStep,
    ],
  );

  const inspectServicePort = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state = useSetupStore.getState();
      const result = await inspectPort(resolveSetupPortInspectionPort({
        mode: state.mode,
        externalBaseUrlDraft: state.externalBaseUrlDraft,
        profile: state.profile,
      }));
      setPortState(toPortState(result));
      syncStep();
    } catch (err) {
      const message = formatReadinessFailureMessage(err, "service");
      setError(message);
      if (useSetupStore.getState().mode === "external") {
        setExternalBaseUrlError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [setError, setExternalBaseUrlError, setLoading, setPortState, syncStep]);

  const startManagedService = useCallback(async () => {
    const timer = createUxKpiTimer();
    setLoading(true);
    setError(null);
    try {
      const profile = useSetupStore.getState().profile;
      if (!profile) {
        setError("未找到配置");
        return;
      }
      const inspection = await inspectPort(profile.port);
      const inspectedPortState = toPortState(inspection);
      setPortState(inspectedPortState);
      if (inspectedPortState === "external-chatlog") {
        setError(settingsMessagesZhCN.setup.service.externalServiceOccupied);
        syncStep();
        return;
      }
      if (inspectedPortState === "occupied") {
        setError(settingsMessagesZhCN.setup.service.portOccupied);
        syncStep();
        return;
      }
      if (inspectedPortState === "owned") {
        const healthy = await fetchHealth(
          profile.httpAddr,
          createDiagnosticHttpOptions({
            endpointFamily: "health",
            method: "GET",
            recoveryHint: "check-service",
          }),
        );
        setReadiness({ httpReady: healthy });
        if (!healthy) {
          setReadiness({ dbReady: false });
        }
        if (healthy) {
          const dbResult = await fetchDbReadiness(
            profile.httpAddr,
            createDiagnosticHttpOptions({
              endpointFamily: "db",
              method: "GET",
              recoveryHint: "check-service",
            }),
          );
          setReadiness({ dbReady: dbResult.ready });
        }
        syncStep();
        recordSetupCompletedIfReady(timer.durationMs());
        return;
      }
      await startManagedSidecar({
        mode: "managed",
        configDir: profile.configDir,
        dataDir: profile.dataDir,
        workDir: profile.workDir,
        httpAddr: profile.httpAddr,
      });
      setPortState("owned");
      const healthy = await fetchHealth(
        profile.httpAddr,
        createDiagnosticHttpOptions({
          endpointFamily: "health",
          method: "GET",
          recoveryHint: "check-service",
        }),
      );
      setReadiness({ httpReady: healthy });
      if (!healthy) {
        setReadiness({ dbReady: false });
      }
      if (healthy) {
        const dbResult = await fetchDbReadiness(
          profile.httpAddr,
          createDiagnosticHttpOptions({
            endpointFamily: "db",
            method: "GET",
            recoveryHint: "check-service",
          }),
        );
        setReadiness({ dbReady: dbResult.ready });
      }
      syncStep();
      recordSetupCompletedIfReady(timer.durationMs());
    } catch (err) {
      setError(formatSafeUserFacingError(err));
    } finally {
      setLoading(false);
    }
  }, [recordSetupCompletedIfReady, setError, setLoading, setPortState, setReadiness, syncStep]);

  const connectExternalService = useCallback(
    async (baseUrl: string) => {
      const timer = createUxKpiTimer();
      setLoading(true);
      setError(null);
      setExternalBaseUrlError(null);
      try {
        const validation = validateChatlogServiceBaseUrl(baseUrl);
        if (!validation.ok) {
          setExternalBaseUrlError(validation.error);
          setError(validation.error);
          setReadiness({ httpReady: false, dbReady: false });
          return;
        }

        const normalizedBaseUrl = validation.baseUrl;
        setExternalBaseUrlDraft(normalizedBaseUrl);
        const healthy = await fetchHealth(
          normalizedBaseUrl,
          createDiagnosticHttpOptions({
            endpointFamily: "health",
            method: "GET",
            recoveryHint: "check-service",
          }),
        );
        if (!healthy) {
          setError("无法连接到外部服务");
          setReadiness({ httpReady: false, dbReady: false });
          return;
        }
        setReadiness({ httpReady: true });
        const dbResult = await fetchDbReadiness(
          normalizedBaseUrl,
          createDiagnosticHttpOptions({
            endpointFamily: "db",
            method: "GET",
            recoveryHint: "check-service",
          }),
        );
        setReadiness({ dbReady: dbResult.ready });
        const lastValidatedAt = new Date().toISOString();
        const summary = await saveExternalConnectionConfig({
          httpAddr: normalizedBaseUrl,
          port: validation.port,
          lastValidatedAt,
        });
        setMode("external");
        setActivePath("external-service");
        setProfile(summary);
        setPortState("external-chatlog");
        if (!dbResult.ready) {
          setError(dbResult.message || "服务已连接，但数据库尚未就绪");
        }
        syncStep();
        recordSetupCompletedIfReady(timer.durationMs());
      } catch (err) {
        const message = formatReadinessFailureMessage(err, "service");
        setError(message);
        setExternalBaseUrlError(message);
      } finally {
        setLoading(false);
      }
    },
    [
      setError,
      setExternalBaseUrlDraft,
      setExternalBaseUrlError,
      setActivePath,
      setLoading,
      setMode,
      setPortState,
      setProfile,
      setReadiness,
      recordSetupCompletedIfReady,
      syncStep,
    ],
  );

  const checkReadiness = useCallback(async () => {
    const timer = createUxKpiTimer();
    const state = useSetupStore.getState();
    setError(null);
    try {
      const validation = resolveSetupReadinessBaseUrl({
        mode: state.mode,
        externalBaseUrlDraft: state.externalBaseUrlDraft,
        profile: state.profile,
      });
      if (!validation.ok) {
        setError(validation.error);
        if (state.mode === "external") {
          setExternalBaseUrlError(validation.error);
        }
        setReadiness({ httpReady: false, dbReady: false });
        syncStep();
        return;
      }
      if (state.mode === "external") {
        setExternalBaseUrlError(null);
      }
      const healthy = await fetchHealth(
        validation.baseUrl,
        createDiagnosticHttpOptions({
          endpointFamily: "health",
          method: "GET",
          recoveryHint: "check-service",
        }),
      );
      setReadiness({ httpReady: healthy });

      if (!healthy) {
        setReadiness({ dbReady: false });
      }

      if (healthy) {
        const dbResult = await fetchDbReadiness(
          validation.baseUrl,
          createDiagnosticHttpOptions({
            endpointFamily: "db",
            method: "GET",
            recoveryHint: "check-service",
          }),
        );
        setReadiness({ dbReady: dbResult.ready });
      }
      syncStep();
      recordSetupCompletedIfReady(timer.durationMs());
    } catch {
      setReadiness({ httpReady: false, dbReady: false });
      setError("无法刷新服务状态，请检查服务地址或稍后重试。");
      syncStep();
    }
  }, [recordSetupCompletedIfReady, setError, setExternalBaseUrlError, setReadiness, syncStep]);

  const stopManagedService = useCallback(async () => {
    try {
      await stopManagedSidecar();
      setPortState("free");
      setReadiness({ httpReady: false, dbReady: false });
      syncStep();
    } catch (err) {
      setError(formatSafeUserFacingError(err));
    }
  }, [setError, setPortState, setReadiness, syncStep]);

  const openWorkbench = useCallback(() => {
    if (!useSetupStore.getState().dbReady) {
      setError("数据库尚未就绪，请刷新数据库状态后再进入工作台。");
      return;
    }
    navigate("/workbench", { replace: true });
  }, [navigate, setError]);

  return {
    loadExistingProfile,
    chooseMode,
    chooseSetupPath,
    importDataDirectory,
    chooseAndImportDataDirectory,
    detectDataDirectories,
    importDetectedDataDirectory,
    chooseManualDataDirectory,
    chooseManualWorkDirectory,
    saveManualConfig,
    inspectServicePort,
    startManagedService,
    connectExternalService,
    checkReadiness,
    stopManagedService,
    openWorkbench,
  };
}

function normalizeDetectedCandidates(candidates: WxPathCandidate[]) {
  return candidates.map((candidate, index) => ({
    id: `candidate-${index + 1}`,
    path: candidate.path,
    label: candidate.label,
    exists: candidate.exists,
    source: candidate.source,
    confidence: candidate.confidence,
  }));
}
