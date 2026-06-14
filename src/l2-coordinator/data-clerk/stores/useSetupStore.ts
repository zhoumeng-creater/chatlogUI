import { create } from "zustand";
import type { ServerConfigDraft } from "@l4/system";
import type {
  SetupMode,
  SetupPathId,
  SetupProfileSummary,
  PortState,
  SetupStepId,
  SetupDetectedPathCandidate,
  SetupDetectedPathStatus,
} from "@l2/data-clerk/types/setup";

export type ManualConfigFieldErrors = Record<string, string>;

const defaultManualDraft: ServerConfigDraft = {
  dataDir: "",
  workDir: "",
  platform: "windows",
  version: 4,
  fullVersion: "",
  dataKey: "",
  imgKey: "",
  httpAddr: "127.0.0.1:5030",
  saveDecryptedMedia: true,
};

interface SetupStoreData {
  mode: SetupMode;
  activePath: SetupPathId;
  currentStep: SetupStepId;
  profile: SetupProfileSummary | null;
  portState: PortState;
  httpReady: boolean;
  dbReady: boolean;
  externalBaseUrlDraft: string;
  externalBaseUrlError: string | null;
  manualDraft: ServerConfigDraft;
  manualFieldErrors: ManualConfigFieldErrors;
  detectedPathCandidates: SetupDetectedPathCandidate[];
  detectedPathStatus: SetupDetectedPathStatus;
  detectedPathError: string | null;
  loading: boolean;
  error: string | null;
  diagnostic: string | null;
}

interface SetupStoreActions {
  setMode: (mode: SetupMode) => void;
  setActivePath: (path: SetupPathId) => void;
  setCurrentStep: (step: SetupStepId) => void;
  setProfile: (profile: SetupProfileSummary | null) => void;
  setPortState: (state: PortState) => void;
  setReadiness: (readiness: { httpReady?: boolean; dbReady?: boolean }) => void;
  setExternalBaseUrlDraft: (value: string) => void;
  setExternalBaseUrlError: (error: string | null) => void;
  setManualDraft: (draft: ServerConfigDraft) => void;
  setManualFieldErrors: (errors: ManualConfigFieldErrors) => void;
  setDetectedPathState: (state: Partial<Pick<
    SetupStoreData,
    "detectedPathCandidates" | "detectedPathStatus" | "detectedPathError"
  >>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDiagnostic: (diagnostic: string | null) => void;
  reset: () => void;
}

type SetupStore = SetupStoreData & SetupStoreActions;

const initialState: SetupStoreData = {
  mode: "managed",
  activePath: "recommended-import",
  currentStep: "mode",
  profile: null,
  portState: "unknown",
  httpReady: false,
  dbReady: false,
  externalBaseUrlDraft: "http://127.0.0.1:5030",
  externalBaseUrlError: null,
  manualDraft: { ...defaultManualDraft },
  manualFieldErrors: {},
  detectedPathCandidates: [],
  detectedPathStatus: "idle",
  detectedPathError: null,
  loading: false,
  error: null,
  diagnostic: null,
};

export const useSetupStore = create<SetupStore>((set) => ({
  ...initialState,
  setMode: (mode) => set({ mode }),
  setActivePath: (activePath) => set({ activePath }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setProfile: (profile) => set({ profile }),
  setPortState: (portState) => set({ portState }),
  setReadiness: ({ httpReady, dbReady }) =>
    set((state) => ({
      httpReady: httpReady ?? state.httpReady,
      dbReady: dbReady ?? state.dbReady,
    })),
  setExternalBaseUrlDraft: (externalBaseUrlDraft) =>
    set({ externalBaseUrlDraft, externalBaseUrlError: null }),
  setExternalBaseUrlError: (externalBaseUrlError) => set({ externalBaseUrlError }),
  setManualDraft: (manualDraft) => set({ manualDraft }),
  setManualFieldErrors: (manualFieldErrors) => set({ manualFieldErrors }),
  setDetectedPathState: (nextState) => set((state) => ({
    detectedPathCandidates: nextState.detectedPathCandidates ?? state.detectedPathCandidates,
    detectedPathStatus: nextState.detectedPathStatus ?? state.detectedPathStatus,
    detectedPathError: nextState.detectedPathError ?? state.detectedPathError,
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setDiagnostic: (diagnostic) => set({ diagnostic }),
  reset: () => set({ ...initialState, manualDraft: { ...defaultManualDraft }, manualFieldErrors: {} }),
}));
