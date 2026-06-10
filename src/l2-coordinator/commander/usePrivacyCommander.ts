import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";

export function usePrivacyCommander() {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);

  return {
    privacyOn,
  };
}
