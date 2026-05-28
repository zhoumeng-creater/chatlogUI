import { create } from "zustand";
import type { UpdateStatus } from "@/l2-coordinator/api-docs/update";

interface UpdateStoreData {
  status: UpdateStatus;
  version: string;
  notes: string;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  errorMessage: string;
}

interface UpdateStoreActions {
  setStatus: (status: UpdateStatus) => void;
  setVersion: (version: string, notes: string) => void;
  setProgress: (downloaded: number, total: number) => void;
  setError: (message: string) => void;
  reset: () => void;
}

type UpdateStore = UpdateStoreData & UpdateStoreActions;

const initialState: UpdateStoreData = {
  status: "idle",
  version: "",
  notes: "",
  progress: 0,
  totalBytes: 0,
  downloadedBytes: 0,
  errorMessage: "",
};

export const useUpdateStore = create<UpdateStore>((set) => ({
  ...initialState,

  setStatus: (status: UpdateStatus) => set({ status }),

  setVersion: (version: string, notes: string) =>
    set({ version, notes, status: "available" }),

  setProgress: (downloaded: number, total: number) =>
    set({
      downloadedBytes: downloaded,
      totalBytes: total,
      progress: total > 0 ? Math.round((downloaded / total) * 100) : 0,
    }),

  setError: (message: string) =>
    set({ status: "error", errorMessage: message }),

  reset: () => set(initialState),
}));
