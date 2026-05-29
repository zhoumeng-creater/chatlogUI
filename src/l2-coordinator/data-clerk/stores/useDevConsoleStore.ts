import { create } from "zustand";

export type LogLevel = "stdout" | "stderr" | "error" | "system";

export interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
}

const MAX_LOGS = 5000;

let nextId = 0;

interface DevConsoleState {
  logs: LogEntry[];
  visible: boolean;
  autoScroll: boolean;
}

interface DevConsoleActions {
  addLog: (level: LogLevel, message: string) => void;
  clear: () => void;
  toggle: () => void;
  setVisible: (visible: boolean) => void;
}

type DevConsoleStore = DevConsoleState & DevConsoleActions;

export const useDevConsoleStore = create<DevConsoleStore>((set) => ({
  logs: [],
  visible: false,
  autoScroll: true,

  addLog: (level: LogLevel, message: string) =>
    set((state) => {
      const entry: LogEntry = {
        id: nextId++,
        time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
        level,
        message,
      };
      const logs = [...state.logs, entry];
      if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS);
      }
      return { logs };
    }),

  clear: () => set({ logs: [] }),

  toggle: () => set((state) => ({ visible: !state.visible })),

  setVisible: (visible: boolean) => set({ visible }),
}));
