import { useCallback } from "react";
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
  const setMode = useSetupStore((s) => s.setMode);
  const setActivePath = useSetupStore((s) => s.setActivePath);
  const setCurrentStep = useSetupStore((s) => s.setCurrentStep);
  const setProfile = useSetupStore((s) => s.setProfile);
  const setPortState = useSetupStore((s) => s.setPortState);
  const setReadiness = useSetupStore((s) => s.setReadiness);
  const setExternalBaseUrlDraft = useSetupStore((s) => s.setExternalBaseUrlDraft);
  const setExternalBaseUrlError = useSetupStore((s) => s.setExternalBaseUrlError);
  const setManualFieldErrors = useSetupStore((s) => s.setManualFieldErrors);
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
        setError("5030 端口已有外部 chatlog_alpha 服务。请切换到外部服务模式连接，或手动停止该服务后再启动托管服务。");
        syncStep();
        return;
      }
      if (inspectedPortState === "occupied") {
        setError("5030 端口被其他进程占用。请关闭该进程或修改服务端口后再启动。");
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
    } catch (err) {
      setError(formatSafeUserFacingError(err));
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setPortState, setReadiness, syncStep]);

  const connectExternalService = useCallback(
    async (baseUrl: string) => {
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
      syncStep,
    ],
  );

  const checkReadiness = useCallback(async () => {
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
    } catch {
      setReadiness({ httpReady: false, dbReady: false });
      setError("无法刷新服务状态，请检查服务地址或稍后重试。");
      syncStep();
    }
  }, [setError, setExternalBaseUrlError, setReadiness, syncStep]);

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
    saveManualConfig,
    inspectServicePort,
    startManagedService,
    connectExternalService,
    checkReadiness,
    stopManagedService,
    openWorkbench,
  };
}
