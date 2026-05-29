import { create } from "zustand";
import type {
  SetupMode,
  SetupProfileSummary,
  PortState,
  SetupStepId,
} from "@l2/data-clerk/types/setup";

interface SetupStoreData {
  mode: SetupMode;
  currentStep: SetupStepId;
  profile: SetupProfileSummary | null;
  portState: PortState;
  httpReady: boolean;
  dbReady: boolean;
  loading: boolean;
  error: string | null;
  diagnostic: string | null;
}

interface SetupStoreActions {
  setMode: (mode: SetupMode) => void;
  setCurrentStep: (step: SetupStepId) => void;
  setProfile: (profile: SetupProfileSummary | null) => void;
  setPortState: (state: PortState) => void;
  setReadiness: (readiness: { httpReady?: boolean; dbReady?: boolean }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDiagnostic: (diagnostic: string | null) => void;
  reset: () => void;
}

type SetupStore = SetupStoreData & SetupStoreActions;

const initialState: SetupStoreData = {
  mode: "managed",
  currentStep: "config",
  profile: null,
  portState: "unknown",
  httpReady: false,
  dbReady: false,
  loading: false,
  error: null,
  diagnostic: null,
};

export const useSetupStore = create<SetupStore>((set) => ({
  ...initialState,
  setMode: (mode) => set({ mode }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setProfile: (profile) => set({ profile }),
  setPortState: (portState) => set({ portState }),
  setReadiness: ({ httpReady, dbReady }) =>
    set((state) => ({
      httpReady: httpReady ?? state.httpReady,
      dbReady: dbReady ?? state.dbReady,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setDiagnostic: (diagnostic) => set({ diagnostic }),
  reset: () => set(initialState),
}));
