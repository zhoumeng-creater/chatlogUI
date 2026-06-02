import { useUpdateCommander } from "./useUpdateCommander";
import { deriveUpdateNotificationView } from "./updateNotificationViewModel";

export function useUpdateNotificationCommander() {
  const update = useUpdateCommander();

  return {
    view: deriveUpdateNotificationView(update),
    notes: update.notes,
    status: update.status,
    actions: {
      dismiss: update.dismissUpdate,
      download: update.downloadUpdate,
      install: update.installAndRestart,
      retry: update.downloadUpdate,
    },
  };
}
