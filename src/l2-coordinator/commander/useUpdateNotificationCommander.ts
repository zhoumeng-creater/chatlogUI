import { useLocation, useNavigate } from "react-router-dom";
import { useUpdateCommander } from "./useUpdateCommander";
import { deriveUpdateNotificationView } from "./updateNotificationViewModel";
import { buildSettingsRoute } from "./settingsNavigation";

export function useUpdateNotificationCommander() {
  const navigate = useNavigate();
  const location = useLocation();
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
      openSettings: () => navigate(buildSettingsRoute({
        source: "update",
        returnRoute: `${location.pathname}${location.search}`,
        section: "about",
      })),
    },
  };
}
