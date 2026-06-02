import type { WindowMaterial } from "@l2/api-docs/settings";

export interface AppShellViewInput {
  title: string;
  privacyOn: boolean;
  windowMaterial: WindowMaterial;
}

export interface AppShellView {
  title: string;
  privacyOn: boolean;
  windowMaterial: WindowMaterial;
}

export function deriveAppShellView(input: AppShellViewInput): AppShellView {
  return {
    title: input.title,
    privacyOn: input.privacyOn,
    windowMaterial: input.windowMaterial,
  };
}
