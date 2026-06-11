import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useAiCommander } from "./useAiCommander";
import { useSettingsCommander } from "./useSettingsCommander";
import { useUpdateCommander } from "./useUpdateCommander";
import { useDiagnosticsCommander } from "./useDiagnosticsCommander";
import { getActiveChatlogServiceSummary } from "./chatlogRequestContext";
import {
  deriveSettingsAiSemanticSummary,
  deriveSettingsDataServiceSummary,
} from "./settingsConfigOwnership";
import {
  deriveSettingsReturnAction,
  normalizeSettingsInitialCategory,
} from "./settingsNavigation";

export function useSettingsPageCommander() {
  const location = useLocation();
  const settings = useSettingsCommander();
  const update = useUpdateCommander();
  const diagnostics = useDiagnosticsCommander();
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const setupProfile = useSetupStore((s) => s.profile);
  const httpReady = useSetupStore((s) => s.httpReady);
  const dbReady = useSetupStore((s) => s.dbReady);
  const activeService = useMemo(
    () => getActiveChatlogServiceSummary(setupProfile),
    [setupProfile],
  );
  const ai = useAiCommander();
  const [updateStatusText, setUpdateStatusText] = useState("");
  const appliedSearchRef = useRef<string | null>(null);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialCategory = useMemo(
    () => normalizeSettingsInitialCategory({
      source: params.get("source"),
      section: params.get("section"),
    }),
    [params],
  );
  const returnAction = useMemo(
    () => deriveSettingsReturnAction({
      source: params.get("source"),
      returnRoute: params.get("return"),
      dbReady,
    }),
    [dbReady, params],
  );

  useEffect(() => {
    if (!settings.loaded) return;
    if (appliedSearchRef.current === location.search) return;
    appliedSearchRef.current = location.search;
    if (settings.activeCategory !== initialCategory) {
      settings.setActiveCategory(initialCategory);
    }
  }, [initialCategory, location.search, settings]);

  const checkForUpdates = useCallback(async () => {
    setUpdateStatusText("正在检查更新...");
    const hasUpdate = await update.checkUpdate();
    if (!hasUpdate) {
      setUpdateStatusText("已是最新版本");
      window.setTimeout(() => setUpdateStatusText(""), 3000);
    }
  }, [update]);

  const dataServiceView = useMemo(
    () => deriveSettingsDataServiceSummary({
      wxDataPath: settings.settings.wxDataPath,
      serviceLabel: activeService.serviceLabel,
      mode: activeService.mode,
      httpReady,
      dbReady,
      privacyOn: settings.settings.privacyOn,
    }),
    [
      activeService.mode,
      activeService.serviceLabel,
      dbReady,
      httpReady,
      settings.settings.privacyOn,
      settings.settings.wxDataPath,
    ],
  );

  const aiSemanticView = useMemo(
    () => deriveSettingsAiSemanticSummary({
      moduleKind: ai.moduleView.kind,
      indexStatus: ai.indexStatus,
      privacyOn: settings.settings.privacyOn,
    }),
    [ai.indexStatus, ai.moduleView.kind, settings.settings.privacyOn],
  );

  return {
    ...settings,
    sidecarStatus,
    serviceLabel: dataServiceView.serviceLabel,
    indexStatus: ai.indexStatus,
    returnAction,
    dataServiceView,
    aiSemanticView,
    checkForUpdates,
    updateStatusText,
    diagnostics,
  };
}
