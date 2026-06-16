import { useLocation, useNavigate } from "react-router-dom";
import { useUpdateCommander } from "./useUpdateCommander";
import { deriveUpdateNotificationView } from "./updateNotificationViewModel";
import { buildSettingsRoute } from "./settingsNavigation";
import { recordErrorRecoveryKpiEvent } from "./uxKpiEvents";

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
      retry: () => {
        recordErrorRecoveryKpiEvent({
          sourceModule: "update",
          recoveryAction: "retry",
          outcome: "success",
        });
        update.downloadUpdate();
      },
      openSettings: () => {
        recordErrorRecoveryKpiEvent({
          sourceModule: "update",
          recoveryAction: "open-settings",
          outcome: "success",
        });
        navigate(buildSettingsRoute({
          source: "update",
          returnRoute: `${location.pathname}${location.search}`,
          section: "about",
        }));
      },
    },
  };
}
